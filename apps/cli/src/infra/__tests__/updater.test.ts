import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createUpdater, isNewer, parseSemver, planStage, platformTriple, tarballName } from '../updater';

describe('semver helpers', () => {
  test('parseSemver strips v and trailing suffixes', () => {
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('0.2.0')).toEqual([0, 2, 0]);
    expect(parseSemver('1.2.3-rc.1')).toEqual([1, 2, 3]);
    expect(parseSemver('garbage')).toBeUndefined();
  });

  test('isNewer compares components in order', () => {
    expect(isNewer('0.2.0', '0.1.9')).toBe(true);
    expect(isNewer('1.0.0', '0.9.9')).toBe(true);
    expect(isNewer('0.2.0', '0.2.0')).toBe(false);
    expect(isNewer('0.1.0', '0.2.0')).toBe(false);
    expect(isNewer('bad', '0.1.0')).toBe(false);
  });
});

describe('planStage', () => {
  test('is unknown without both versions', () => {
    expect(planStage({ current: undefined, latest: '0.2.0' })).toBe('unknown');
    expect(planStage({ current: '0.1.0', latest: undefined })).toBe('unknown');
  });

  test('is up-to-date when not newer', () => {
    expect(planStage({ current: '0.2.0', latest: '0.2.0' })).toBe('up-to-date');
  });

  test('stages when newer and nothing equivalent is staged', () => {
    expect(planStage({ current: '0.1.0', latest: '0.2.0' })).toBe('stage');
    expect(planStage({ current: '0.1.0', latest: '0.2.0', staged: '0.1.5' })).toBe('stage');
  });

  test('is already-staged when the staged version covers latest', () => {
    expect(planStage({ current: '0.1.0', latest: '0.2.0', staged: '0.2.0' })).toBe('already-staged');
  });
});

describe('tarballName', () => {
  test('matches the install-script convention', () => {
    expect(tarballName('qwery', { os: 'macos', arch: 'aarch64' })).toBe('qwery-macos-aarch64.tar.gz');
    expect(tarballName('gfs', { os: 'linux', arch: 'x86_64' })).toBe('gfs-linux-x86_64.tar.gz');
  });
});

describe('createUpdater.checkAndStage', () => {
  let root: string;
  const savedVersion = process.env.QWERY_VERSION;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qwery-updater-'));
    process.env.QWERY_VERSION = '0.1.0';
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (savedVersion === undefined) delete process.env.QWERY_VERSION;
    else process.env.QWERY_VERSION = savedVersion;
  });

  // Fake GitHub: latest releases + a tarball body; the fake extractor lays out
  // the expected tree so layout()/findEntry can stage it.
  const fetchImpl = (async (url: string | URL) => {
    const u = String(url);
    if (u.includes('/releases/latest')) {
      const tag = u.includes('qwery-agent') ? 'v0.2.0' : 'v0.1.14';
      return new Response(JSON.stringify({ tag_name: tag }), { status: 200 });
    }
    if (u.endsWith('.tar.gz')) return new Response(new Uint8Array([0x1f, 0x8b, 0x00]), { status: 200 });
    return new Response('', { status: 404 });
  }) as unknown as typeof fetch;

  const extract = async (archive: string, dest: string) => {
    const file = archive.split('/').pop() ?? '';
    if (file.startsWith('qwery-')) {
      mkdirSync(join(dest, 'release', 'lib'), { recursive: true });
      writeFileSync(join(dest, 'release', 'lib', 'qwery-bin'), 'BIN');
    } else {
      writeFileSync(join(dest, 'gfs'), 'GFSBIN');
    }
    return true;
  };

  const skipIfUnsupported = platformTriple() === undefined;

  test.skipIf(skipIfUnsupported)('stages both artifacts, then is idempotent', async () => {
    const warnings: string[] = [];
    const updater = createUpdater({
      root,
      fetchImpl,
      extract,
      currentGfsVersion: async () => '0.1.13',
      logger: { warn: (m) => warnings.push(m) },
    });

    const first = await updater.checkAndStage();
    if (warnings.length) throw new Error(`staging warned: ${warnings.join('; ')}`);
    expect(first.find((o) => o.app === 'qwery')?.action).toBe('stage');
    expect(first.find((o) => o.app === 'gfs')?.action).toBe('stage');

    // qwery: lib/ staged with version + ready marker
    expect(existsSync(join(root, 'staged', 'qwery', '.ready'))).toBe(true);
    expect(readFileSync(join(root, 'staged', 'qwery', 'version'), 'utf-8')).toBe('0.2.0');
    expect(existsSync(join(root, 'staged', 'qwery', 'lib', 'qwery-bin'))).toBe(true);
    // gfs: binary staged
    expect(existsSync(join(root, 'staged', 'gfs', 'gfs'))).toBe(true);
    expect(readFileSync(join(root, 'staged', 'gfs', 'version'), 'utf-8')).toBe('0.1.14');
    // no leftover temp dirs
    expect(existsSync(join(root, 'staged', '.tmp-qwery'))).toBe(false);

    const second = await updater.checkAndStage();
    expect(second.find((o) => o.app === 'qwery')?.action).toBe('already-staged');
    expect(second.find((o) => o.app === 'gfs')?.action).toBe('already-staged');
  });

  test.skipIf(skipIfUnsupported)('does nothing when already on the latest version', async () => {
    process.env.QWERY_VERSION = '0.2.0';
    const updater = createUpdater({
      root,
      fetchImpl,
      extract,
      currentGfsVersion: async () => '0.1.14',
    });
    const outcomes = await updater.checkAndStage();
    expect(outcomes.every((o) => o.action === 'up-to-date')).toBe(true);
    expect(existsSync(join(root, 'staged', 'qwery'))).toBe(false);
  });

  test.skipIf(skipIfUnsupported)('marks an artifact failed when the download is a 404', async () => {
    const failing = (async (url: string | URL) => {
      const u = String(url);
      if (u.includes('/releases/latest')) {
        return new Response(JSON.stringify({ tag_name: 'v0.2.0' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const updater = createUpdater({
      root,
      fetchImpl: failing,
      extract,
      currentGfsVersion: async () => '0.1.13',
    });
    const outcomes = await updater.checkAndStage();
    expect(outcomes.find((o) => o.app === 'qwery')?.action).toBe('failed');
    expect(existsSync(join(root, 'staged', 'qwery', '.ready'))).toBe(false);
  });
});
