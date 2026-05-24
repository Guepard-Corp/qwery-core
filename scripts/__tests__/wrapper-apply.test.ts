import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APPLY_SCRIPT = join(import.meta.dir, '..', 'wrapper-apply.sh');

/** Sources wrapper-apply.sh and runs the apply function against `root`. */
async function runApply(root: string, env: Record<string, string> = {}): Promise<number> {
  const proc = Bun.spawn(['bash', '-c', `source "${APPLY_SCRIPT}"; qwery_apply_staged_updates "${root}"`], {
    env: { ...process.env, ...env },
    stdout: 'ignore',
    stderr: 'ignore',
  });
  return await proc.exited;
}

function freshRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'qwery-apply-'));
  mkdirSync(join(root, 'bin'), { recursive: true });
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(join(root, 'lib', 'qwery-bin'), 'OLD');
  writeFileSync(join(root, 'version'), '0.1.0');
  return root;
}

describe('qwery_apply_staged_updates', () => {
  test('swaps a staged qwery lib/ and updates the version marker', async () => {
    const root = freshRoot();
    const staged = join(root, 'staged', 'qwery');
    mkdirSync(join(staged, 'lib'), { recursive: true });
    writeFileSync(join(staged, 'lib', 'qwery-bin'), 'NEW');
    writeFileSync(join(staged, 'version'), '0.2.0');
    writeFileSync(join(staged, '.ready'), '');

    expect(await runApply(root)).toBe(0);
    expect(readFileSync(join(root, 'lib', 'qwery-bin'), 'utf-8')).toBe('NEW');
    expect(readFileSync(join(root, 'version'), 'utf-8').trim()).toBe('0.2.0');
    expect(existsSync(join(root, 'staged', 'qwery'))).toBe(false);
    expect(existsSync(join(root, 'lib.old'))).toBe(false);

    rmSync(root, { recursive: true, force: true });
  });

  test('ignores a staged dir without the .ready marker', async () => {
    const root = freshRoot();
    const staged = join(root, 'staged', 'qwery');
    mkdirSync(join(staged, 'lib'), { recursive: true });
    writeFileSync(join(staged, 'lib', 'qwery-bin'), 'NEW'); // no .ready

    expect(await runApply(root)).toBe(0);
    expect(readFileSync(join(root, 'lib', 'qwery-bin'), 'utf-8')).toBe('OLD');
    expect(existsSync(join(staged, 'lib'))).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });

  test('replaces the gfs binary at a writable HOME location', async () => {
    const root = freshRoot();
    const fakeHome = mkdtempSync(join(tmpdir(), 'qwery-home-'));
    mkdirSync(join(fakeHome, '.gfs', 'bin'), { recursive: true });
    writeFileSync(join(fakeHome, '.gfs', 'bin', 'gfs'), 'OLDGFS');

    const staged = join(root, 'staged', 'gfs');
    mkdirSync(staged, { recursive: true });
    writeFileSync(join(staged, 'gfs'), 'NEWGFS');
    writeFileSync(join(staged, 'version'), '0.1.14');
    writeFileSync(join(staged, '.ready'), '');

    // PATH without gfs → falls back to $HOME/.gfs/bin/gfs.
    expect(await runApply(root, { HOME: fakeHome, PATH: '/usr/bin:/bin' })).toBe(0);
    expect(readFileSync(join(fakeHome, '.gfs', 'bin', 'gfs'), 'utf-8')).toBe('NEWGFS');
    expect(existsSync(join(root, 'staged', 'gfs'))).toBe(false);

    rmSync(root, { recursive: true, force: true });
    rmSync(fakeHome, { recursive: true, force: true });
  });

  test('is a no-op when there is no staging dir', async () => {
    const root = freshRoot();
    expect(await runApply(root)).toBe(0);
    expect(readFileSync(join(root, 'lib', 'qwery-bin'), 'utf-8')).toBe('OLD');
    rmSync(root, { recursive: true, force: true });
  });
});
