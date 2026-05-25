import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUpdater, platformTriple, tarballName } from '../updater';

const APPLY_SCRIPT = join(import.meta.dir, '..', '..', '..', '..', '..', 'scripts', 'wrapper-apply.sh');
const triple = platformTriple();

/**
 * Full pipeline e2e (no binary compile): a local server mimics the two GitHub
 * endpoints the updater hits; createUpdater runs the *real* fetch + `tar`
 * extraction + atomic staging; then wrapper-apply.sh performs the real swap.
 * Validates everything between "release published" and "next launch runs it".
 */
describe.skipIf(triple === undefined)('e2e: download → stage → wrapper apply', () => {
  let root: string;
  let tarballBytes: Uint8Array;
  let server: ReturnType<typeof Bun.serve>;
  const savedVersion = process.env.QWERY_VERSION;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qwery-e2e-'));
    // Simulate an installed v0.1.0 (bin/ + lib/ + version marker).
    mkdirSync(join(root, 'bin'), { recursive: true });
    mkdirSync(join(root, 'lib'), { recursive: true });
    writeFileSync(join(root, 'lib', 'qwery-bin'), 'OLD-BINARY');
    writeFileSync(join(root, 'version'), '0.1.0');
    process.env.QWERY_VERSION = '0.1.0';

    // Build a real v0.2.0 release tarball: <name>/lib/qwery-bin.
    const build = mkdtempSync(join(tmpdir(), 'qwery-rel-'));
    const relName = `qwery-${triple?.os}-${triple?.arch}`;
    mkdirSync(join(build, relName, 'lib'), { recursive: true });
    writeFileSync(join(build, relName, 'lib', 'qwery-bin'), 'NEW-BINARY-0.2.0');
    const tarPath = join(build, `${relName}.tar.gz`);
    spawnSync('tar', ['-czf', tarPath, '-C', build, relName], { stdio: 'ignore' });
    tarballBytes = new Uint8Array(readFileSync(tarPath));

    server = Bun.serve({
      port: 0, // ephemeral
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname.endsWith('/releases/latest')) {
          return new Response(JSON.stringify({ tag_name: 'v0.2.0' }), { status: 200 });
        }
        if (url.pathname.endsWith('.tar.gz')) {
          return new Response(tarballBytes, { status: 200 });
        }
        return new Response('not found', { status: 404 });
      },
    });
  });

  afterEach(() => {
    server.stop(true);
    rmSync(root, { recursive: true, force: true });
    if (savedVersion === undefined) delete process.env.QWERY_VERSION;
    else process.env.QWERY_VERSION = savedVersion;
  });

  test('stages the downloaded release, then the wrapper swaps it in', async () => {
    const base = `http://localhost:${server.port}`;
    const updater = createUpdater({
      root,
      apiBase: base,
      downloadBase: base,
      // gfs unknown ⇒ skipped (the local server only serves the qwery asset shape).
      currentGfsVersion: async () => undefined,
    });

    const outcomes = await updater.checkAndStage();
    expect(outcomes.find((o) => o.app === 'qwery')?.action).toBe('stage');

    // The real tar extraction produced the staged lib/ with the new binary.
    const stagedBin = join(root, 'staged', 'qwery', 'lib', 'qwery-bin');
    expect(existsSync(stagedBin)).toBe(true);
    expect(readFileSync(stagedBin, 'utf-8')).toBe('NEW-BINARY-0.2.0');
    expect(readFileSync(join(root, 'staged', 'qwery', 'version'), 'utf-8')).toBe('0.2.0');

    // Apply via the real wrapper logic → the running lib + version flip over.
    const apply = Bun.spawn(
      ['bash', '-c', `source "${APPLY_SCRIPT}"; qwery_apply_staged_updates "${root}"`],
      { stdout: 'ignore', stderr: 'ignore' },
    );
    expect(await apply.exited).toBe(0);

    expect(readFileSync(join(root, 'lib', 'qwery-bin'), 'utf-8')).toBe('NEW-BINARY-0.2.0');
    expect(readFileSync(join(root, 'version'), 'utf-8').trim()).toBe('0.2.0');
    expect(existsSync(join(root, 'staged', 'qwery'))).toBe(false);

    // Asserts the asset name matches the install-script convention end to end.
    expect(tarballName('qwery', triple as { os: string; arch: string })).toContain('qwery-');
  });
});
