import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const HOME = homedir();
const WORKSPACE_ROOT = process.cwd();
/** qwery's private state dir: master key, persistence DB, config. */
const QWERY_HOME = path.join(HOME, '.qwery');
const CACHE_ROOT = path.join(QWERY_HOME, 'cache');
const ALLOWED_ROOTS = [WORKSPACE_ROOT, CACHE_ROOT];

export const BASH_TIMEOUT_MS = 30_000;
export const BASH_MAX_OUTPUT_BYTES = 64 * 1024;
export const READ_MAX_BYTES = 64 * 1024;
export const WRITE_MAX_BYTES = 1_000_000;

/**
 * `~/.qwery` holds the AES master key, the persistence DB (encrypted datasource
 * credentials), and config. `bash` must never touch it: otherwise the LLM can
 * exfiltrate the very secrets the vault exists to hide (read the master key +
 * the ciphertext + the open-source algorithm = full decryption). The `read`
 * tool already refuses these paths via `resolveSafePath`; `bash` needs its own
 * guard. The cache subdir stays accessible. Agents must use the datasource and
 * GFS tools instead of poking qwery's internals.
 */
const QWERY_GUARD_MESSAGE =
  "bash: access to qwery's private directory (~/.qwery) is blocked — it holds the master key and encrypted datasource credentials. Never read it. Use the datasource tools (datasourceList / datasourceTest / datasourceAttach) and the GFS tools instead.";

/**
 * Best-effort static guard, applied on every platform. It is the only FS guard
 * where the OS sandbox is unavailable (non-darwin), and defense-in-depth where
 * it is. Matches references to `~/.qwery` (absolute, `~`, or `$HOME`) that are
 * not the cache subdir, plus the master key by name.
 */
export function assertBashCommandAllowed(command: string): void {
  const refsQweryPrivate =
    /\.qwery\/(?!cache(?:\/|\b))/.test(command) || /\.qwery\/?(?:\s|$|;|&|\|)/.test(command);
  const refsMasterKey = /\.master\.key\b/.test(command);
  if (refsQweryPrivate || refsMasterKey) throw new Error(QWERY_GUARD_MESSAGE);
}

/**
 * macOS kernel-enforced sandbox profile: allow everything, then deny read+write
 * on `~/.qwery` while re-allowing its `cache` subdir. Unlike the static guard,
 * this cannot be bypassed with env vars, encoding, or indirection. Linux
 * hardening (bubblewrap) is a follow-up; until then the static guard stands.
 */
const SANDBOX_AVAILABLE = process.platform === 'darwin' && existsSync('/usr/bin/sandbox-exec');
const SANDBOX_PROFILE = [
  '(version 1)',
  '(allow default)',
  `(deny file-read* file-write* (subpath "${QWERY_HOME}"))`,
  `(allow file-read* file-write* (subpath "${CACHE_ROOT}"))`,
].join('\n');

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
 * process is killed after `BASH_TIMEOUT_MS`.
 *
 * FS access to `~/.qwery` (secrets) is blocked two ways: a static guard
 * (`assertBashCommandAllowed`, every platform) and, on macOS, a kernel-enforced
 * `sandbox-exec` profile. The command otherwise has normal filesystem access so
 * legitimate tooling (git, bun, build steps) keeps working (ADR #18).
 */
export async function runBash(command: string): Promise<BashResult> {
  assertBashCommandAllowed(command);
  const [bin, args] = SANDBOX_AVAILABLE
    ? (['sandbox-exec', ['-p', SANDBOX_PROFILE, 'bash', '-c', command]] as const)
    : (['bash', ['-c', command]] as const);
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
