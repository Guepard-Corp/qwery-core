import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  assertBashCommandAllowed,
  BASH_MAX_OUTPUT_BYTES,
  BASH_TIMEOUT_MS,
  bwrapArgs,
  READ_MAX_BYTES,
  readFileSafe,
  resolveSafePath,
  runBash,
  WRITE_MAX_BYTES,
  writeFileSafe,
} from '../system-tools';

const fixtureDir = path.join(process.cwd(), '.test-system-tools');

beforeEach(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
});

afterAll(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
});

describe('resolveSafePath', () => {
  test('accepts a path inside the workspace', () => {
    const p = resolveSafePath('.test-system-tools/foo.txt');
    expect(p.startsWith(process.cwd())).toBe(true);
  });

  test('accepts a path inside ~/.qwery/cache', () => {
    const p = resolveSafePath(path.join(homedir(), '.qwery', 'cache', 'x'));
    expect(p).toContain('.qwery/cache');
  });

  test('refuses /etc/passwd', () => {
    expect(() => resolveSafePath('/etc/passwd')).toThrow(/outside/);
  });

  test('refuses parent-traversal that escapes the workspace', () => {
    // Build a path that resolves above cwd
    const escapePath = path.join('..', '..', '..', '..', 'etc', 'passwd');
    expect(() => resolveSafePath(escapePath)).toThrow(/outside/);
  });

  test('refuses an absolute path outside both roots', () => {
    expect(() => resolveSafePath('/tmp/elsewhere')).toThrow(/outside/);
  });
});

describe('readFileSafe', () => {
  test('reads a small file', async () => {
    const p = path.join(fixtureDir, 'small.txt');
    writeFileSync(p, 'hello');
    const r = await readFileSafe(p);
    expect(r.content).toBe('hello');
    expect(r.truncated).toBe(false);
    expect(r.bytes).toBe(5);
  });

  test('reports truncated=true and caps content at READ_MAX_BYTES', async () => {
    const p = path.join(fixtureDir, 'big.txt');
    const big = 'a'.repeat(READ_MAX_BYTES + 100);
    writeFileSync(p, big);
    const r = await readFileSafe(p);
    expect(r.truncated).toBe(true);
    expect(r.content.length).toBe(READ_MAX_BYTES);
  });

  test('refuses to read a directory', async () => {
    await expect(readFileSafe(fixtureDir)).rejects.toThrow(/regular file/);
  });

  test('refuses paths outside the workspace', async () => {
    await expect(readFileSafe('/etc/passwd')).rejects.toThrow(/outside/);
  });
});

describe('writeFileSafe', () => {
  test('writes content and creates parent directories', async () => {
    const p = path.join(fixtureDir, 'sub', 'dir', 'file.txt');
    const r = await writeFileSafe(p, 'data');
    expect(r.bytes).toBe(4);
    expect(existsSync(p)).toBe(true);
  });

  test('refuses to write content larger than WRITE_MAX_BYTES', async () => {
    const huge = 'a'.repeat(WRITE_MAX_BYTES + 1);
    const p = path.join(fixtureDir, 'huge.txt');
    await expect(writeFileSafe(p, huge)).rejects.toThrow(/exceeds/);
  });

  test('refuses paths outside the workspace', async () => {
    await expect(writeFileSafe('/etc/poisoned', 'pwn')).rejects.toThrow(/outside/);
  });
});

describe('runBash', () => {
  test('captures stdout from a simple command', async () => {
    const r = await runBash("printf 'hello'");
    expect(r.stdout).toBe('hello');
    expect(r.exitCode).toBe(0);
    expect(r.truncated).toBe(false);
  });

  test('captures stderr and exit code on failure', async () => {
    const r = await runBash("printf 'oops' 1>&2 ; exit 7");
    expect(r.stderr).toContain('oops');
    expect(r.exitCode).toBe(7);
  });

  test('truncates stdout that exceeds the output cap', async () => {
    // Print a single line of 'a' bigger than the cap. printf %.0s is fast.
    const bytes = BASH_MAX_OUTPUT_BYTES + 8192;
    const r = await runBash(`printf 'a%.0s' $(seq 1 ${bytes})`);
    expect(r.truncated).toBe(true);
    expect(Buffer.byteLength(r.stdout, 'utf-8')).toBeLessThanOrEqual(BASH_MAX_OUTPUT_BYTES);
  });

  test('passes user-supplied content as one argv (no injection at argv level)', async () => {
    // The whole string is one arg to bash -c, so semicolons inside an
    // *interpolated* single-quoted string can't break out at argv. We do not
    // claim shell-level safety beyond that.
    const r = await runBash('printf \'%s\' "hello ; world"');
    expect(r.stdout).toBe('hello ; world');
  });

  test('BASH_TIMEOUT_MS is a positive number', () => {
    expect(BASH_TIMEOUT_MS).toBeGreaterThan(0);
  });

  test('rejects a command that reads qwery secrets before spawning', async () => {
    await expect(runBash('sqlite3 ~/.qwery/qwery.sqlite "SELECT config FROM datasources"')).rejects.toThrow(
      /private directory/,
    );
  });
});

describe('assertBashCommandAllowed — ~/.qwery guard', () => {
  const blocked = [
    'cat ~/.qwery/.master.key',
    'sqlite3 ~/.qwery/qwery.sqlite "SELECT config FROM datasources"',
    'cat ~/.qwery/config.json | python3 -c "import sys"',
    `cat ${path.join(homedir(), '.qwery', 'config.json')}`,
    'find ~/.qwery -name "*.json"',
    'cp /tmp/x ~/.qwery/.master.key',
  ];
  for (const cmd of blocked) {
    test(`blocks: ${cmd.slice(0, 40)}`, () => {
      expect(() => assertBashCommandAllowed(cmd)).toThrow(/private directory/);
    });
  }

  const allowed = [
    'ls -la',
    'git status',
    'bun test',
    'cat ~/.qwery/cache/models.json', // cache subdir is permitted
    'echo "no qwery here"',
    'cat package.json',
  ];
  for (const cmd of allowed) {
    test(`allows: ${cmd.slice(0, 40)}`, () => {
      expect(() => assertBashCommandAllowed(cmd)).not.toThrow();
    });
  }
});

describe('bwrapArgs — Linux sandbox recipe', () => {
  test('masks ~/.qwery with a tmpfs and isolates the command', () => {
    const args = bwrapArgs("printf 'x'");
    const qweryHome = path.join(homedir(), '.qwery');
    // The qwery private dir is overlaid with an empty tmpfs.
    const ti = args.indexOf('--tmpfs');
    expect(ti).toBeGreaterThanOrEqual(0);
    expect(args[ti + 1]).toBe(qweryHome);
    // The command runs after the `--` separator, via bash -c.
    const sep = args.indexOf('--');
    expect(args.slice(sep)).toEqual(['--', 'bash', '-c', "printf 'x'"]);
    // Whole filesystem is passed through so legit tooling still works.
    expect(args.slice(0, 3)).toEqual(['--dev-bind', '/', '/']);
  });
});
