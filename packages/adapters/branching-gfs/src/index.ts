import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  type BranchInfo,
  type Branching,
  type BranchingStatus,
  GfsCommandError,
  type ImportPayload,
  type InitSpec,
  type SchemaDiff,
} from '@qwery/domain';
import {
  parseBranchDecoration,
  parseHead,
  parseSchemaDiffJson,
  parseStatusJson,
  parseVersion,
} from './parsers';

export * from './parsers';

const execFileAsync = promisify(execFile);

export interface GfsRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Runs a gfs subcommand. Injectable so the adapter unit-tests without the binary. */
export type GfsRunner = (args: string[]) => Promise<GfsRunResult>;

export interface GfsBranchingOptions {
  /** gfs binary to invoke (default: "gfs" from PATH). */
  binary?: string;
  /** Repository root used as the working directory for gfs commands. */
  repoPath?: string;
  /** Override the command runner (tests). */
  run?: GfsRunner;
}

function spawnRunner(binary: string, repoPath?: string): GfsRunner {
  return async (args) => {
    try {
      const { stdout, stderr } = await execFileAsync(binary, args, {
        cwd: repoPath,
        maxBuffer: 32 * 1024 * 1024,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: unknown; message?: string };
      return {
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? '',
        exitCode: typeof e.code === 'number' ? e.code : 1,
      };
    }
  };
}

class GfsBranching implements Branching {
  constructor(private readonly run: GfsRunner) {}

  /** Run a command, throwing a typed error on non-zero exit. */
  private async ok(args: string[]): Promise<string> {
    const result = await this.run(args);
    if (result.exitCode !== 0) {
      throw new GfsCommandError(args.join(' '), result.exitCode, result.stderr);
    }
    return result.stdout;
  }

  private async head(): Promise<string | undefined> {
    const result = await this.run(['log', '--max-count', '1', '--full-hash']);
    return result.exitCode === 0 ? parseHead(result.stdout) : undefined;
  }

  async version(): Promise<string | undefined> {
    const result = await this.run(['version']);
    return result.exitCode === 0 ? parseVersion(result.stdout) : undefined;
  }

  async isAvailable(): Promise<boolean> {
    try {
      return (await this.version()) !== undefined;
    } catch {
      return false;
    }
  }

  async status(): Promise<BranchingStatus> {
    const stdout = await this.ok(['status', '--output', 'json']);
    return parseStatusJson(stdout, await this.head());
  }

  async init(spec: InitSpec): Promise<void> {
    await this.ok(['init', '--database-provider', spec.provider, '--database-version', spec.databaseVersion]);
  }

  async importData(payload: ImportPayload): Promise<void> {
    const args = ['import', '--file', payload.filePath];
    if (payload.format) args.push('--format', payload.format);
    await this.ok(args);
  }

  async commit(message: string): Promise<string> {
    await this.ok(['commit', '-m', message]);
    return (await this.head()) ?? '';
  }

  async branch(name: string, startRevision?: string): Promise<BranchInfo> {
    const args = ['checkout', '-b', name];
    if (startRevision) args.push(startRevision);
    await this.ok(args);
    return { name, isCurrent: true };
  }

  async checkout(revision: string): Promise<void> {
    await this.ok(['checkout', revision]);
  }

  async listBranches(): Promise<BranchInfo[]> {
    const status = await this.status();
    const log = await this.run(['log', '--max-count', '1']);
    return parseBranchDecoration(log.exitCode === 0 ? log.stdout : '', status.currentBranch);
  }

  async diff(from: string, to: string): Promise<SchemaDiff> {
    const stdout = await this.ok(['schema', 'diff', '--json', from, to]);
    return parseSchemaDiffJson(stdout);
  }
}

export function createGfsBranching(options: GfsBranchingOptions = {}): Branching {
  const run = options.run ?? spawnRunner(options.binary ?? 'gfs', options.repoPath);
  return new GfsBranching(run);
}
