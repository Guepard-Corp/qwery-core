import { describe, expect, test } from 'bun:test';
import { GfsCommandError } from '@qwery/domain';
import {
  createGfsBranching,
  type GfsRunner,
  type GfsRunResult,
  parseBranchDecoration,
  parseHead,
  parseSchemaDiffJson,
  parseStatusJson,
  parseVersion,
} from './index';

const HEAD = '0b116f11cab656644030d95e5ea4e083f49a6adb52f9c800138327799e49625f';

const STATUS_JSON = JSON.stringify({
  current_branch: 'main',
  compute: {
    provider: 'postgres',
    version: '17',
    container_status: 'running',
    container_id: 'guepard-postgres-1',
    connection_string: 'postgresql://user@localhost:5432/db',
  },
  active_workspace_data_dir: '/tmp/.gfs/workspaces/main/0/data',
});

const LOG_FULL_HASH = `commit ${HEAD} (HEAD -> main, dev)\nAuthor: Hani <hc@guepard.run>\nDate:   Tue Feb 24 13:45:29 2026 +0000\n\n    v2\n`;

/** Builds a runner that resolves canned results per command and records calls. */
function mockRunner(handler: (args: string[]) => GfsRunResult): { run: GfsRunner; calls: string[][] } {
  const calls: string[][] = [];
  const run: GfsRunner = async (args) => {
    calls.push(args);
    return handler(args);
  };
  return { run, calls };
}

const ok = (stdout = ''): GfsRunResult => ({ stdout, stderr: '', exitCode: 0 });
const fail = (stderr: string, exitCode = 1): GfsRunResult => ({ stdout: '', stderr, exitCode });

describe('parsers', () => {
  test('parseVersion extracts semver from "gfs 0.1.13"', () => {
    expect(parseVersion('gfs 0.1.13\n')).toBe('0.1.13');
  });

  test('parseVersion returns undefined when absent', () => {
    expect(parseVersion('no version here')).toBeUndefined();
  });

  test('parseHead reads the 64-char commit hash', () => {
    expect(parseHead(LOG_FULL_HASH)).toBe(HEAD);
  });

  test('parseHead returns undefined without a hash', () => {
    expect(parseHead('no commits yet')).toBeUndefined();
  });

  test('parseStatusJson maps the real gfs shape', () => {
    const status = parseStatusJson(STATUS_JSON, HEAD);
    expect(status.currentBranch).toBe('main');
    expect(status.provider).toBe('postgres');
    expect(status.providerVersion).toBe('17');
    expect(status.containerRunning).toBe(true);
    expect(status.connectionString).toBe('postgresql://user@localhost:5432/db');
    expect(status.head).toBe(HEAD);
  });

  test('parseStatusJson treats empty connection string as undefined and non-running container', () => {
    const status = parseStatusJson(
      JSON.stringify({
        current_branch: 'main',
        compute: { container_status: 'not_provisioned', connection_string: '' },
      }),
    );
    expect(status.connectionString).toBeUndefined();
    expect(status.containerRunning).toBe(false);
  });

  test('parseBranchDecoration extracts branches and marks current', () => {
    const branches = parseBranchDecoration(LOG_FULL_HASH, 'main');
    expect(branches.map((b) => b.name).sort()).toEqual(['dev', 'main']);
    expect(branches.find((b) => b.name === 'main')?.isCurrent).toBe(true);
  });

  test('parseBranchDecoration falls back to the current branch when no decoration', () => {
    expect(parseBranchDecoration('', 'feature')).toEqual([{ name: 'feature', isCurrent: true }]);
  });

  test('parseSchemaDiffJson reads counts and identical flag', () => {
    const diff = parseSchemaDiffJson(
      JSON.stringify({
        identical: false,
        tables_added: 2,
        tables_removed: 1,
        columns_added: 5,
        columns_removed: 0,
      }),
    );
    expect(diff).toMatchObject({ identical: false, tablesAdded: 2, tablesRemoved: 1, columnsAdded: 5 });
  });

  test('parseSchemaDiffJson keeps raw output on non-JSON', () => {
    const diff = parseSchemaDiffJson('schemas are identical');
    expect(diff.identical).toBe(false);
    expect(diff.raw).toBe('schemas are identical');
  });
});

describe('GfsBranching via injected runner', () => {
  test('version returns parsed semver, undefined on failure', async () => {
    const gfs = createGfsBranching({ run: mockRunner(() => ok('gfs 0.1.13')).run });
    expect(await gfs.version()).toBe('0.1.13');
    const down = createGfsBranching({ run: mockRunner(() => fail('not found', 127)).run });
    expect(await down.version()).toBeUndefined();
  });

  test('isAvailable reflects version resolution', async () => {
    expect(await createGfsBranching({ run: mockRunner(() => ok('gfs 0.1.13')).run }).isAvailable()).toBe(
      true,
    );
    expect(await createGfsBranching({ run: mockRunner(() => fail('boom', 127)).run }).isAvailable()).toBe(
      false,
    );
  });

  test('status combines json + head from log', async () => {
    const gfs = createGfsBranching({
      run: mockRunner((args) => (args[0] === 'status' ? ok(STATUS_JSON) : ok(LOG_FULL_HASH))).run,
    });
    const status = await gfs.status();
    expect(status.currentBranch).toBe('main');
    expect(status.head).toBe(HEAD);
  });

  test('commit records then returns the new head', async () => {
    const { run, calls } = mockRunner((args) => (args[0] === 'log' ? ok(LOG_FULL_HASH) : ok()));
    const ref = await createGfsBranching({ run }).commit('auto: before DROP');
    expect(ref).toBe(HEAD);
    expect(calls[0]).toEqual(['commit', '-m', 'auto: before DROP']);
  });

  test('branch builds checkout -b with optional start revision', async () => {
    const { run, calls } = mockRunner(() => ok());
    const info = await createGfsBranching({ run }).branch('experiment', 'main');
    expect(info).toEqual({ name: 'experiment', isCurrent: true });
    expect(calls[0]).toEqual(['checkout', '-b', 'experiment', 'main']);
  });

  test('init passes provider and version flags', async () => {
    const { run, calls } = mockRunner(() => ok());
    await createGfsBranching({ run }).init({ provider: 'postgres', databaseVersion: '17' });
    expect(calls[0]).toEqual(['init', '--database-provider', 'postgres', '--database-version', '17']);
  });

  test('importData builds file + format flags', async () => {
    const { run, calls } = mockRunner(() => ok());
    await createGfsBranching({ run }).importData({ filePath: '/tmp/dump.sql', format: 'sql' });
    expect(calls[0]).toEqual(['import', '--file', '/tmp/dump.sql', '--format', 'sql']);
  });

  test('non-zero exit throws a typed GfsCommandError', async () => {
    const gfs = createGfsBranching({ run: mockRunner(() => fail('has no schema')).run });
    await expect(gfs.diff('HEAD~1', 'HEAD')).rejects.toBeInstanceOf(GfsCommandError);
  });

  test('checkout throws on failure with command context', async () => {
    const gfs = createGfsBranching({ run: mockRunner(() => fail('unknown revision', 2)).run });
    await expect(gfs.checkout('nope')).rejects.toThrow(/checkout nope/);
  });
});

// Integration smoke test against the real binary — skipped when gfs is absent.
const gfsInstalled = await (async () => {
  try {
    return (await createGfsBranching().version()) !== undefined;
  } catch {
    return false;
  }
})();

describe.if(gfsInstalled)('GfsBranching against the real gfs binary', () => {
  test('reports an installed version', async () => {
    const version = await createGfsBranching().version();
    expect(version).toMatch(/\d+\.\d+\.\d+/);
    expect(await createGfsBranching().isAvailable()).toBe(true);
  });
});
