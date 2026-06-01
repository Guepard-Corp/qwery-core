import { describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Datasource, Logger } from '@qwery/domain';
import type { Track } from '../track';
import {
  assess,
  type CommandRunner,
  type ExplainMetrics,
  parseExplainMetrics,
  testOnlyTempGfsAuditDir,
  validateRemediationInGfsCli,
} from '../validate-remediation-in-gfs-cli';

const logger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const track: Track = async (_name, _input, fn) => (await fn()).llm;

const datasource: Datasource = {
  id: '4d34234a-5ed7-4fae-a9c5-1e194996147d',
  name: 'local pg',
  description: '',
  slug: 'local-pg',
  datasource_provider: 'postgres',
  datasource_driver: 'postgresql',
  config: { connectionUrl: 'postgresql://postgres:postgres@localhost:5432/employees?sslmode=disable' },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function explainJson(executionTime: number, readBlocks: number): string {
  return JSON.stringify([
    {
      'Planning Time': 1,
      'Execution Time': executionTime,
      Plan: {
        'Node Type': 'Seq Scan',
        'Shared Hit Blocks': 10,
        'Shared Read Blocks': readBlocks,
        'Temp Written Blocks': 0,
      },
    },
  ]);
}

async function withDumpDirs(fn: (dumpDir: string, auditDir: string) => Promise<void>) {
  const root = join(testOnlyTempGfsAuditDir(), `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const dumpDir = join(root, 'dumps');
  const auditDir = join(root, 'audits');
  process.env.QWERY_GFS_DUMPS_DIR = dumpDir;
  process.env.QWERY_GFS_AUDITS_DIR = auditDir;
  await mkdir(dumpDir, { recursive: true });
  try {
    await fn(dumpDir, auditDir);
  } finally {
    delete process.env.QWERY_GFS_DUMPS_DIR;
    delete process.env.QWERY_GFS_AUDITS_DIR;
    await rm(root, { recursive: true, force: true });
  }
}

describe('validateRemediationInGfsCli', () => {
  test('parses aggregate EXPLAIN metrics without row data', () => {
    const metrics = parseExplainMetrics(explainJson(25, 7));
    expect(metrics.totalTimeMs).toBe(26);
    expect(metrics.executionTimeMs).toBe(25);
    expect(metrics.sharedReadBlocks).toBe(7);
    expect(metrics.nodeTypes).toEqual(['Seq Scan']);
  });

  test('throws when EXPLAIN output carries no timing (would-be zero baseline)', () => {
    const noTiming = JSON.stringify([{ Plan: { 'Node Type': 'Seq Scan' } }]);
    expect(() => parseExplainMetrics(noTiming)).toThrow('no timing');
  });

  const metrics = (totalTimeMs: number, sharedReadBlocks: number): ExplainMetrics => ({
    planningTimeMs: 0,
    executionTimeMs: totalTimeMs,
    totalTimeMs,
    sharedHitBlocks: 0,
    sharedReadBlocks,
    tempWrittenBlocks: 0,
    nodeTypes: [],
  });

  test('assess: a zero baseline is inconclusive, never validated', () => {
    expect(assess(metrics(0, 0), metrics(0, 0), 'maintenance').recommendationStatus).toBe('inconclusive');
    expect(assess(metrics(0, 0), metrics(50, 5), 'latency').recommendationStatus).toBe('inconclusive');
  });

  test('assess: maintenance rejects a read-I/O regression even within latency tolerance', () => {
    // latency essentially flat (within 10%) but reads went up → not validated.
    expect(assess(metrics(100, 10), metrics(105, 25), 'maintenance').recommendationStatus).toBe('rejected');
    expect(assess(metrics(100, 10), metrics(105, 5), 'maintenance').recommendationStatus).toBe('validated');
  });

  test('assess: latency improvement without extra reads is validated', () => {
    expect(assess(metrics(100, 20), metrics(40, 5), 'latency').recommendationStatus).toBe('validated');
  });

  test('rejects write-capable validation query', async () => {
    await expect(
      validateRemediationInGfsCli(
        {
          logger,
          track,
          getAttachedDatasource: async () => datasource,
        },
        {
          validationQuery: 'DELETE FROM audit_lab.customer_activity',
          actionStatements: ['ANALYZE audit_lab.customer_activity'],
          validationType: 'maintenance',
        },
      ),
    ).rejects.toThrow('validationQuery must be a SELECT or WITH statement');
  });

  test('fails clearly when prepared dump is missing', async () => {
    await withDumpDirs(async () => {
      await expect(
        validateRemediationInGfsCli(
          {
            logger,
            track,
            getAttachedDatasource: async () => datasource,
          },
          {
            validationQuery: 'SELECT count(*) FROM audit_lab.customer_activity',
            actionStatements: ['ANALYZE audit_lab.customer_activity'],
            validationType: 'maintenance',
          },
        ),
      ).rejects.toThrow('Prepared GFS dump not found');
    });
  });

  test('runs GFS branch validation and returns before/after assessment', async () => {
    await withDumpDirs(async (dumpDir) => {
      await writeFile(join(dumpDir, 'localhost-5432-employees.sql'), '-- dump');
      const calls: string[] = [];
      let explainCalls = 0;
      let statusCalls = 0;
      const runCommand: CommandRunner = async (command, args) => {
        calls.push(`${command} ${args.join(' ')}`);
        if (command === 'gfs' && args[0] === 'version')
          return { stdout: 'gfs 0.1.13', stderr: '', exitCode: 0 };
        if (command === 'gfs' && args[0] === 'status') {
          statusCalls += 1;
          if (!calls.some((call) => call.includes('gfs init')))
            return { stdout: '', stderr: 'not initialized', exitCode: 1 };
          if (statusCalls === 2) {
            return {
              stdout: JSON.stringify({ compute: { connection_string: '' } }),
              stderr: '',
              exitCode: 0,
            };
          }
          return {
            stdout: JSON.stringify({ compute: { connection_string: 'postgresql://gfs/local' } }),
            stderr: '',
            exitCode: 0,
          };
        }
        if (command === 'gfs' && args[0] === 'log') {
          return { stdout: 'commit abcdef1234567890', stderr: '', exitCode: 0 };
        }
        if (command === 'psql' && String(args.at(-1)).startsWith('EXPLAIN')) {
          explainCalls += 1;
          return {
            stdout: explainJson(explainCalls === 1 ? 100 : 40, explainCalls === 1 ? 20 : 5),
            stderr: '',
            exitCode: 0,
          };
        }
        return { stdout: '', stderr: '', exitCode: 0 };
      };

      const result = await validateRemediationInGfsCli(
        {
          sessionId: 'session-1',
          logger,
          track,
          getAttachedDatasource: async () => datasource,
          runCommand,
        },
        {
          validationQuery: 'SELECT count(*) FROM audit_lab.customer_activity',
          actionStatements: ['ANALYZE audit_lab.customer_activity'],
          branchName: 'audit-analyze',
          validationType: 'maintenance',
        },
      );

      expect(result.ok).toBe(true);
      expect(result.branchName).toBe('audit-analyze');
      expect(result.originalDatabaseUnchanged).toBe(true);
      expect(result.validation.assessment.recommendationStatus).toBe('validated');
      expect(calls).toContain('gfs init --database-provider postgres --database-version 16');
      expect(calls).toContain('gfs compute start');
      expect(calls.some((call) => call.startsWith('gfs checkout -b audit-analyze'))).toBe(true);
      expect(calls).toContain('psql postgresql://gfs/local --tuples-only --no-align --command SELECT 1');
      expect(calls).toContain('psql postgresql://gfs/local --command ANALYZE audit_lab.customer_activity');
    });
  });
});
