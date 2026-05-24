import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const WORKSPACE_ROOT = process.cwd();
const CACHE_ROOT = path.join(homedir(), '.qwery', 'cache');
const ALLOWED_ROOTS = [WORKSPACE_ROOT, CACHE_ROOT];

export const BASH_TIMEOUT_MS = 30_000;
export const BASH_MAX_OUTPUT_BYTES = 64 * 1024;
export const READ_MAX_BYTES = 64 * 1024;
export const WRITE_MAX_BYTES = 1_000_000;

/**
 * Resolve a user-supplied path inside one of the allowed roots (workspace or
 * `~/.qwery/cache`). Throws if the resolved path escapes both roots. ADR #18.
 */
export function resolveSafePath(input: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, input);
  for (const root of ALLOWED_ROOTS) {
    if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  }
  throw new Error(
    `Path "${input}" resolves outside the workspace and cache roots. Allowed roots: ${ALLOWED_ROOTS.join(', ')}`,
  );
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
 * process is killed after `BASH_TIMEOUT_MS`. ADR #18 — MVP scope: no FS or
 * process sandbox yet, only argv-level injection safety + timeout + cwd lock.
 */
export async function runBash(command: string): Promise<BashResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('bash', ['-c', command], { cwd: WORKSPACE_ROOT });
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
