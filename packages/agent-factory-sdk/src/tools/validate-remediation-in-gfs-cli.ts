import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Datasource, Logger } from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import { postgresConnectionUrl } from './pg-native';
import type { Track } from './track';

const execFileAsync = promisify(execFile);
const MAX_ACTIONS = 8;
const POSTGRES_READY_TIMEOUT_MS = 45_000;
const POSTGRES_READY_RETRY_DELAY_MS = 750;
const WRITE_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|VACUUM|COPY|MERGE|CALL|DO|ANALYZE|SET|RESET)\b/i;

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string | undefined>; signal?: AbortSignal },
) => Promise<CommandResult>;

export interface ValidateRemediationInGfsCliDeps {
  sessionId?: string;
  signal?: AbortSignal;
  logger: Logger;
  track: Track;
  getAttachedDatasource?: () => Promise<Datasource | null>;
  revealDatasourceSecrets?: (datasource: Datasource) => Promise<Record<string, unknown>>;
  runCommand?: CommandRunner;
}

export const ValidateRemediationInGfsCliInputSchema = z.object({
  validationQuery: z.string().describe('SELECT or WITH query to benchmark before and after remediation.'),
  actionStatements: z
    .array(z.string())
    .min(1)
    .max(MAX_ACTIONS)
    .describe('SQL statements to run inside the isolated GFS branch.'),
  branchName: z.string().min(3).max(63).optional(),
  validationType: z.enum(['latency', 'config', 'maintenance']).default('latency'),
});

export type ValidateRemediationInGfsCliInput = z.infer<typeof ValidateRemediationInGfsCliInputSchema>;

export interface ExplainMetrics {
  totalTimeMs: number;
  planningTimeMs: number;
  executionTimeMs: number;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
  tempWrittenBlocks: number;
  nodeTypes: string[];
}

export interface ValidateRemediationInGfsCliOutput {
  ok: true;
  repoPath: string;
  branchName: string;
  baseCommit: string;
  afterCommit: string;
  validationType: 'latency' | 'config' | 'maintenance';
  originalDatabaseUnchanged: true;
  validation: {
    before: ExplainMetrics;
    after: ExplainMetrics;
    delta: {
      totalTimeMs: number;
      sharedReadBlocks: number;
      tempWrittenBlocks: number;
    };
    assessment: {
      recommendationStatus: 'validated' | 'rejected' | 'inconclusive';
      reason: string;
    };
  };
}

function defaultRunCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string | undefined>; signal?: AbortSignal } = {},
): Promise<CommandResult> {
  return execFileAsync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    signal: options.signal,
    maxBuffer: 64 * 1024 * 1024,
  })
    .then(({ stdout, stderr }) => ({ stdout, stderr, exitCode: 0 }))
    .catch((err: { stdout?: string; stderr?: string; code?: unknown; message?: string }) => ({
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1,
    }));
}

function assertSelectSql(sql: string): void {
  const normalized = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
    .trim();
  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    throw new Error('validationQuery must be a SELECT or WITH statement.');
  }
  if (
    normalized
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean).length !== 1
  ) {
    throw new Error('validationQuery must contain exactly one SQL statement.');
  }
  if (WRITE_KEYWORDS.test(normalized)) {
    throw new Error('validationQuery must be read-only; put remediation SQL in actionStatements.');
  }
}

function normalizeActionStatement(sql: string): string {
  const normalized = sql.trim().replace(/;+$/, '');
  if (!normalized) throw new Error('actionStatements cannot contain empty SQL.');
  return normalized;
}

function sanitizeBranchName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function datasourceDumpPath(connectionUrl: string): string {
  const url = new URL(connectionUrl);
  const port = url.port || '5432';
  const database = url.pathname.replace(/^\//, '') || 'postgres';
  const fileName = `${url.hostname}-${port}-${database}.sql`;
  return join(process.env.QWERY_GFS_DUMPS_DIR ?? join(homedir(), '.cache', 'qwery', 'gfs-dumps'), fileName);
}

function sessionRepoPath(sessionId: string, datasourceId: string): string {
  const key = `${sessionId}-${datasourceId}`.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return join(
    process.env.QWERY_GFS_AUDITS_DIR ?? join(homedir(), '.cache', 'qwery', 'gfs-audits'),
    'sessions',
    key,
    'repo',
  );
}

async function ok(
  run: CommandRunner,
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string | undefined>; signal?: AbortSignal },
): Promise<string> {
  const result = await run(command, args, options);
  if (result.exitCode !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout;
}

function parseHead(logStdout: string): string {
  return logStdout.match(/commit\s+([0-9a-f]{7,64})/)?.[1] ?? '';
}

function readConnectionString(statusStdout: string): string {
  const status = JSON.parse(statusStdout) as { compute?: { connection_string?: string } };
  const connectionString = status.compute?.connection_string?.trim();
  if (!connectionString) throw new Error('GFS status did not return a compute connection string.');
  return connectionString;
}

function isRetryablePostgresStartupError(message: string): boolean {
  return /starting up|server closed the connection unexpectedly|connection refused|could not connect|no such file|the database system is starting up/i.test(
    message,
  );
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new Error('Operation aborted.');
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(new Error('Operation aborted.'));
      },
      { once: true },
    );
  });
}

async function waitForPostgresReady(
  run: CommandRunner,
  connectionString: string,
  signal?: AbortSignal,
): Promise<void> {
  const startedAt = Date.now();
  let lastError = 'unknown error';
  while (Date.now() - startedAt < POSTGRES_READY_TIMEOUT_MS) {
    const result = await run(
      'psql',
      [connectionString, '--tuples-only', '--no-align', '--command', 'SELECT 1'],
      {
        signal,
      },
    );
    if (result.exitCode === 0) return;
    lastError = result.stderr.trim() || result.stdout.trim() || lastError;
    if (!isRetryablePostgresStartupError(lastError)) {
      throw new Error(`psql readiness check failed: ${lastError}`);
    }
    await sleep(POSTGRES_READY_RETRY_DELAY_MS, signal);
  }
  throw new Error(`Timed out waiting for GFS PostgreSQL readiness. Last error: ${lastError}`);
}

async function ensureGfsConnectionString(
  run: CommandRunner,
  repoPath: string,
  signal?: AbortSignal,
): Promise<string> {
  const readStatus = async () =>
    readConnectionString(await ok(run, 'gfs', ['status', '--output', 'json'], { cwd: repoPath, signal }));
  try {
    return await readStatus();
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('connection string')) throw err;
  }
  await ok(run, 'gfs', ['compute', 'start'], { cwd: repoPath, signal });
  return readStatus();
}

async function ensureRepo(deps: {
  run: CommandRunner;
  repoPath: string;
  dumpPath: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { run, repoPath, dumpPath, signal } = deps;
  await mkdir(repoPath, { recursive: true });
  const existing = await run('gfs', ['status', '--output', 'json'], { cwd: repoPath, signal });
  if (existing.exitCode !== 0) {
    await rm(repoPath, { recursive: true, force: true });
    await mkdir(repoPath, { recursive: true });
    await ok(run, 'gfs', ['init', '--database-provider', 'postgres', '--database-version', '16'], {
      cwd: repoPath,
      signal,
    });
    const connectionString = await ensureGfsConnectionString(run, repoPath, signal);
    await waitForPostgresReady(run, connectionString, signal);
    await ok(run, 'gfs', ['import', '--file', dumpPath], { cwd: repoPath, signal });
    await ok(run, 'gfs', ['commit', '-m', 'session base snapshot before audit remediation'], {
      cwd: repoPath,
      signal,
    });
  }
  return parseHead(
    await ok(run, 'gfs', ['log', '--max-count', '1', '--full-hash'], { cwd: repoPath, signal }),
  );
}

function collectPlan(plan: unknown, metrics: ExplainMetrics): void {
  if (!plan || typeof plan !== 'object') return;
  const p = plan as Record<string, unknown>;
  if (typeof p['Node Type'] === 'string') metrics.nodeTypes.push(p['Node Type']);
  metrics.sharedHitBlocks += Number(p['Shared Hit Blocks'] ?? 0);
  metrics.sharedReadBlocks += Number(p['Shared Read Blocks'] ?? 0);
  metrics.tempWrittenBlocks += Number(p['Temp Written Blocks'] ?? 0);
  for (const child of Array.isArray(p.Plans) ? p.Plans : []) collectPlan(child, metrics);
}

export function parseExplainMetrics(stdout: string): ExplainMetrics {
  const parsed = JSON.parse(stdout.trim()) as Array<Record<string, unknown>>;
  const root = parsed[0] ?? {};
  // EXPLAIN (ANALYZE, FORMAT JSON) always reports timing at the root. If it is
  // absent the output isn't an ANALYZE plan (or didn't parse), and silently
  // defaulting the timing to 0 would later let assess() mint a bogus verdict
  // off a zero baseline — fail loudly instead.
  if (root['Execution Time'] === undefined && root['Planning Time'] === undefined) {
    throw new Error('EXPLAIN output contained no timing — expected EXPLAIN (ANALYZE, FORMAT JSON).');
  }
  const metrics: ExplainMetrics = {
    planningTimeMs: Number(root['Planning Time'] ?? 0),
    executionTimeMs: Number(root['Execution Time'] ?? 0),
    totalTimeMs: Number(root['Planning Time'] ?? 0) + Number(root['Execution Time'] ?? 0),
    sharedHitBlocks: 0,
    sharedReadBlocks: 0,
    tempWrittenBlocks: 0,
    nodeTypes: [],
  };
  collectPlan(root.Plan, metrics);
  metrics.nodeTypes = Array.from(new Set(metrics.nodeTypes));
  return metrics;
}

async function explain(
  run: CommandRunner,
  connectionString: string,
  sql: string,
  signal?: AbortSignal,
): Promise<ExplainMetrics> {
  const stdout = await ok(
    run,
    'psql',
    [
      connectionString,
      '--tuples-only',
      '--no-align',
      '--command',
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
    ],
    { signal },
  );
  return parseExplainMetrics(stdout);
}

export function assess(
  before: ExplainMetrics,
  after: ExplainMetrics,
  validationType: ValidateRemediationInGfsCliInput['validationType'],
) {
  // A non-positive baseline means the "before" benchmark produced no usable
  // timing. An improvement can't be measured against it, so never let a
  // zero/garbage baseline produce a "validated" verdict — report it instead.
  if (!(before.totalTimeMs > 0)) {
    return {
      recommendationStatus: 'inconclusive' as const,
      reason: 'Baseline benchmark unavailable (no execution time); cannot assess improvement.',
    };
  }
  const totalDelta = after.totalTimeMs - before.totalTimeMs;
  const readDelta = after.sharedReadBlocks - before.sharedReadBlocks;
  if (validationType === 'maintenance') {
    // Maintenance (VACUUM/ANALYZE/REINDEX) isn't expected to speed the probe up,
    // only to avoid making it materially worse — but a read-I/O regression still
    // counts against it.
    if (totalDelta <= before.totalTimeMs * 0.1 && readDelta <= 0) {
      return {
        recommendationStatus: 'validated' as const,
        reason: 'Maintenance completed without material latency or read-I/O regression.',
      };
    }
    return {
      recommendationStatus: 'rejected' as const,
      reason: 'Maintenance caused a material latency or read-I/O regression.',
    };
  }
  if (after.totalTimeMs < before.totalTimeMs && readDelta <= 0) {
    return {
      recommendationStatus: 'validated' as const,
      reason: 'Before/after benchmark improved without increased read I/O.',
    };
  }
  if (after.totalTimeMs > before.totalTimeMs * 1.1 || readDelta > 0) {
    return { recommendationStatus: 'rejected' as const, reason: 'Before/after benchmark regressed.' };
  }
  return {
    recommendationStatus: 'inconclusive' as const,
    reason: 'Before/after benchmark did not show a clear improvement.',
  };
}

export async function validateRemediationInGfsCli(
  deps: ValidateRemediationInGfsCliDeps,
  input: ValidateRemediationInGfsCliInput,
): Promise<ValidateRemediationInGfsCliOutput> {
  assertSelectSql(input.validationQuery);
  const actionStatements = input.actionStatements.map(normalizeActionStatement);
  const datasource = await deps.getAttachedDatasource?.();
  if (!datasource) throw new Error('No datasource is attached. Attach a PostgreSQL datasource first.');
  if (!/^postgres(ql)?$/i.test(datasource.datasource_provider)) {
    throw new Error(
      `validateRemediationInGfsCli supports PostgreSQL only. Received: ${datasource.datasource_provider}`,
    );
  }
  const revealedConfig = deps.revealDatasourceSecrets
    ? await deps.revealDatasourceSecrets(datasource)
    : (datasource.config as Record<string, unknown>);
  const connectionUrl = postgresConnectionUrl(revealedConfig);
  const dumpPath = datasourceDumpPath(connectionUrl);
  if (!existsSync(dumpPath)) {
    throw new Error(`Prepared GFS dump not found at ${dumpPath}. Create it with pg_dump before validation.`);
  }

  const run = deps.runCommand ?? defaultRunCommand;
  await ok(run, 'gfs', ['version'], { signal: deps.signal });
  const repoPath = sessionRepoPath(deps.sessionId ?? 'adhoc', datasource.id);
  const baseCommit = await ensureRepo({ run, repoPath, dumpPath, signal: deps.signal });
  const branchName = sanitizeBranchName(input.branchName ?? `audit-${Date.now()}`);
  await ok(run, 'gfs', ['checkout', '-b', branchName, baseCommit], { cwd: repoPath, signal: deps.signal });
  const connectionString = await ensureGfsConnectionString(run, repoPath, deps.signal);
  await waitForPostgresReady(run, connectionString, deps.signal);
  const before = await explain(run, connectionString, input.validationQuery, deps.signal);
  for (const statement of actionStatements) {
    await ok(run, 'psql', [connectionString, '--command', statement], { signal: deps.signal });
  }
  await ok(run, 'gfs', ['commit', '-m', 'apply audit remediation candidate'], {
    cwd: repoPath,
    signal: deps.signal,
  });
  const afterCommit = parseHead(
    await ok(run, 'gfs', ['log', '--max-count', '1', '--full-hash'], { cwd: repoPath, signal: deps.signal }),
  );
  await waitForPostgresReady(run, connectionString, deps.signal);
  const after = await explain(run, connectionString, input.validationQuery, deps.signal);
  deps.logger.info('gfs.validation.done', { repoPath, branchName, datasourceId: datasource.id });
  return {
    ok: true,
    repoPath,
    branchName,
    baseCommit,
    afterCommit,
    validationType: input.validationType,
    originalDatabaseUnchanged: true,
    validation: {
      before,
      after,
      delta: {
        totalTimeMs: after.totalTimeMs - before.totalTimeMs,
        sharedReadBlocks: after.sharedReadBlocks - before.sharedReadBlocks,
        tempWrittenBlocks: after.tempWrittenBlocks - before.tempWrittenBlocks,
      },
      assessment: assess(before, after, input.validationType),
    },
  };
}

export function createValidateRemediationInGfsCliTool(deps: ValidateRemediationInGfsCliDeps) {
  return tool({
    description:
      'Validate PostgreSQL remediation SQL in an isolated GFS branch using before/after EXPLAIN ANALYZE. The original datasource is never mutated.',
    inputSchema: ValidateRemediationInGfsCliInputSchema,
    execute: async (input) =>
      deps.track('validateRemediationInGfsCli', input, async () => {
        const result = await validateRemediationInGfsCli(deps, input);
        return {
          ui: {
            kind: 'dbAudit' as const,
            tool: 'validateRemediationInGfsCli' as const,
            summary: `Validated remediation in GFS branch ${result.branchName}.`,
            result,
          },
          llm: result,
        };
      }),
  });
}
