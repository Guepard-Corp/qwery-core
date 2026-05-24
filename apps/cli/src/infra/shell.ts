import { exec } from 'node:child_process';

export interface ShellResult {
  output: string;
  exitCode: number;
}

const MAX_OUTPUT = 16_000;
const TIMEOUT_MS = 30_000;

/**
 * Runs a user-issued shell command for the `!` input mode. The output is shown
 * locally only — it is never persisted nor sent to the LLM, so arbitrary shell
 * output never leaks into the agent's context (privacy boundary, ADR #28).
 */
export function runShell(command: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd: process.cwd(), timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const combined = `${stdout ?? ''}${stderr ?? ''}`.replace(/\n$/, '');
        const output =
          combined.length > MAX_OUTPUT ? `${combined.slice(0, MAX_OUTPUT)}\n…(truncated)` : combined;
        // `exec` sets `code` to the process exit code on non-zero exits; a
        // non-numeric code (e.g. a spawn failure or timeout) maps to 1.
        const code = (err as { code?: unknown } | null)?.code;
        const exitCode = typeof code === 'number' ? code : err ? 1 : 0;
        resolve({ output, exitCode });
      },
    );
  });
}
