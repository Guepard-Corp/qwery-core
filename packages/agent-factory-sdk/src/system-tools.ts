import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const HOME = homedir();
const WORKSPACE_ROOT = process.cwd();
/** qwery's private state dir: master key, persistence DB, config, plus benign subdirs. */
const QWERY_HOME = path.join(HOME, '.qwery');
/**
 * Subdirs of `~/.qwery` that ARE legitimate for tools to read: user-authored
 * agent assets (skills, agents, commands, hooks, prompts, templates, plugins,
 * output-styles, themes, statusline), the analysis cache, and logs. Listing
 * here is deny-by-default + allowlist — everything else under `~/.qwery` stays
 * blocked, so a new file never leaks by omission.
 *
 * NEVER add a name that can hold secrets or the user's data. Off-limits, even
 * though they are "agent" dirs:
 *   - config.json / settings.json / settings.local.json (env, keys, perms)
 *   - mcp.json / mcp/ (MCP server env tokens — classic leak vector)
 *   - sessions/ projects/ history/ transcripts/ conversations/ (chat logs:
 *     secrets the user typed in other sessions)
 *   - storage/ (artifacts = query results = row-level data, ADR #28)
 *   - credentials/ auth/ tokens/ keys/, .master.key, *.sqlite*, anonymous-id
 *   - memory/ (handled separately — do not allowlist here)
 */
const QWERY_OPEN_SUBDIRS = [
  'cache',
  'skills',
  'agents',
  'logs',
  'commands',
  'hooks',
  'prompts',
  'templates',
  'output-styles',
  'themes',
  'statusline',
  'plugins',
] as const;
const QWERY_OPEN_PATHS = QWERY_OPEN_SUBDIRS.map((d) => path.join(QWERY_HOME, d));
const ALLOWED_ROOTS = [WORKSPACE_ROOT, ...QWERY_OPEN_PATHS];

export const BASH_TIMEOUT_MS = 30_000;
export const BASH_MAX_OUTPUT_BYTES = 64 * 1024;
export const READ_MAX_BYTES = 64 * 1024;
export const WRITE_MAX_BYTES = 1_000_000;

/**
 * `~/.qwery` holds the AES master key, the persistence DB (encrypted datasource
 * credentials), config, and the telemetry id. `bash` must never read those:
 * otherwise the LLM can exfiltrate the very secrets the vault exists to hide
 * (master key + ciphertext + open-source algorithm = full decryption). Benign
 * subdirs (skills/agents/cache/logs) stay accessible so the agent can `read`
 * user-level skills and agents. Deny-by-default, allowlist the benign.
 */
const QWERY_GUARD_MESSAGE = `bash: access to qwery's private files under ~/.qwery is blocked — they hold the master key and encrypted datasource credentials. Use the datasource tools (datasourceList / datasourceTest / datasourceAttach) and the GFS tools instead. (Reading ~/.qwery/{${QWERY_OPEN_SUBDIRS.join(',')}} is allowed.)`;

/**
 * Best-effort static guard, applied on every platform. It is the only FS guard
 * where the OS sandbox is unavailable (non-darwin), and defense-in-depth where
 * it is. Blocks references to `~/.qwery` that are NOT one of the benign subdirs,
 * plus the master key by name.
 */
export function assertBashCommandAllowed(command: string): void {
  const benign = QWERY_OPEN_SUBDIRS.join('|');
  const refsQweryPrivate =
    new RegExp(`\\.qwery\\/(?!(?:${benign})(?:\\/|\\b))`).test(command) ||
    /\.qwery\/?(?:\s|$|;|&|\|)/.test(command);
  const refsMasterKey = /\.master\.key\b/.test(command);
  if (refsQweryPrivate || refsMasterKey) throw new Error(QWERY_GUARD_MESSAGE);
}

/**
 * macOS kernel-enforced sandbox profile: allow everything, deny read+write on
 * `~/.qwery`, then re-allow the benign subdirs. Unlike the static guard, this
 * cannot be bypassed with env vars, encoding, or indirection.
 */
const SANDBOX_AVAILABLE = process.platform === 'darwin' && existsSync('/usr/bin/sandbox-exec');
const SANDBOX_PROFILE = [
  '(version 1)',
  '(allow default)',
  `(deny file-read* file-write* (subpath "${QWERY_HOME}"))`,
  ...QWERY_OPEN_PATHS.map((p) => `(allow file-read* file-write* (subpath "${p}"))`),
].join('\n');

/**
 * Linux kernel-enforced equivalent via bubblewrap: pass the whole filesystem
 * through (`--dev-bind / /`) so legitimate tooling keeps working, then overlay
 * an empty tmpfs on `~/.qwery` to hide the secrets, re-binding the benign
 * subdirs. Mirrors the macOS deny.
 */
const BWRAP_BIN = '/usr/bin/bwrap';

export function bwrapArgs(command: string): string[] {
  const args = ['--dev-bind', '/', '/', '--tmpfs', QWERY_HOME];
  for (const p of QWERY_OPEN_PATHS) {
    if (existsSync(p)) args.push('--bind', p, p);
  }
  args.push('--', 'bash', '-c', command);
  return args;
}

/**
 * Probe bwrap once, memoized. We don't just check the binary exists: user
 * namespaces are disabled on some kernels and inside some containers, and the
 * recipe must actually run. So we run the real recipe on a trivial command and
 * verify its output. If anything fails, we fall back to the static guard only
 * (no regression — bwrap is used only where it provably works).
 */
let bwrapProbe: Promise<boolean> | null = null;
function detectBwrap(): Promise<boolean> {
  if (process.platform !== 'linux' || !existsSync(BWRAP_BIN)) return Promise.resolve(false);
  if (bwrapProbe) return bwrapProbe;
  bwrapProbe = new Promise<boolean>((resolveProbe) => {
    let out = '';
    const probe = spawn(BWRAP_BIN, bwrapArgs("printf '__bwrap_ok__'"));
    probe.stdout.on('data', (c: Buffer) => {
      out += c.toString('utf-8');
    });
    probe.on('error', () => resolveProbe(false));
    probe.on('close', (code) => resolveProbe(code === 0 && out.includes('__bwrap_ok__')));
  });
  return bwrapProbe;
}

/**
 * Resolve a user-supplied path inside one of the allowed roots: the workspace,
 * or the benign `~/.qwery` subdirs (cache, skills, agents, logs). Throws if the
 * resolved path escapes them all — notably qwery's secrets. ADR #18.
 */
export function resolveSafePath(input: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, input);
  for (const root of ALLOWED_ROOTS) {
    if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  }
  throw new Error(`Path "${input}" resolves outside the allowed roots. Allowed: ${ALLOWED_ROOTS.join(', ')}`);
}

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  truncated: boolean;
}

/**
 * Run a shell command via `bash -c`. We pass the command as a single argument
 * to spawn (not interpolated into another string) so user-supplied content can
 * never break the argv boundary. `cwd` is pinned to the workspace and the
 * process is killed after `BASH_TIMEOUT_MS`.
 *
 * FS access to `~/.qwery` (secrets) is blocked two ways: a static guard
 * (`assertBashCommandAllowed`, every platform) and a kernel-enforced sandbox —
 * `sandbox-exec` on macOS, bubblewrap on Linux when available. The command
 * otherwise has normal filesystem access so legitimate tooling (git, bun, build
 * steps) keeps working (ADR #18).
 */
export async function runBash(command: string): Promise<BashResult> {
  assertBashCommandAllowed(command);
  let bin = 'bash';
  let args: string[] = ['-c', command];
  if (SANDBOX_AVAILABLE) {
    bin = 'sandbox-exec';
    args = ['-p', SANDBOX_PROFILE, 'bash', '-c', command];
  } else if (await detectBwrap()) {
    bin = BWRAP_BIN;
    args = bwrapArgs(command);
  }
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { cwd: WORKSPACE_ROOT });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`bash: command exceeded ${BASH_TIMEOUT_MS}ms`));
    }, BASH_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutBytes < BASH_MAX_OUTPUT_BYTES) {
        const room = BASH_MAX_OUTPUT_BYTES - stdoutBytes;
        if (chunk.byteLength > room) {
          stdoutChunks.push(chunk.subarray(0, room));
          truncated = true;
        } else {
          stdoutChunks.push(chunk);
        }
        stdoutBytes += chunk.byteLength;
      } else {
        truncated = true;
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes < BASH_MAX_OUTPUT_BYTES) {
        const room = BASH_MAX_OUTPUT_BYTES - stderrBytes;
        if (chunk.byteLength > room) {
          stderrChunks.push(chunk.subarray(0, room));
          truncated = true;
        } else {
          stderrChunks.push(chunk);
        }
        stderrBytes += chunk.byteLength;
      } else {
        truncated = true;
      }
    });
    child.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolvePromise({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        exitCode: code ?? 0,
        truncated,
      });
    });
  });
}

export interface ReadResult {
  path: string;
  content: string;
  bytes: number;
  truncated: boolean;
}

export async function readFileSafe(input: string): Promise<ReadResult> {
  const fullPath = resolveSafePath(input);
  const handle = await fs.open(fullPath, 'r');
  try {
    // fstat the open descriptor (not the path) so the file can't be swapped
    // between the check and the read — no TOCTOU race.
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error(`read: "${input}" is not a regular file`);
    const buf = Buffer.alloc(Math.min(stat.size, READ_MAX_BYTES + 1));
    const { bytesRead } = await handle.read({ buffer: buf, position: 0 });
    const truncated = bytesRead > READ_MAX_BYTES;
    const slice = buf.subarray(0, Math.min(bytesRead, READ_MAX_BYTES));
    return {
      path: path.relative(WORKSPACE_ROOT, fullPath) || fullPath,
      content: slice.toString('utf-8'),
      bytes: stat.size,
      truncated,
    };
  } finally {
    await handle.close();
  }
}

export interface WriteResult {
  path: string;
  bytes: number;
}

export async function writeFileSafe(input: string, content: string): Promise<WriteResult> {
  if (Buffer.byteLength(content, 'utf-8') > WRITE_MAX_BYTES) {
    throw new Error(`write: content exceeds ${WRITE_MAX_BYTES} bytes`);
  }
  const fullPath = resolveSafePath(input);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
  return {
    path: path.relative(WORKSPACE_ROOT, fullPath) || fullPath,
    bytes: Buffer.byteLength(content, 'utf-8'),
  };
}
