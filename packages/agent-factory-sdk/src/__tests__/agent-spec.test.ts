import { describe, expect, test } from 'bun:test';
import {
  CodingAgentSpec,
  DataAgentSpec,
  DbPerformanceAuditAgentSpec,
  routeAgent,
  SlowQueryOptimizerAgentSpec,
} from '../agent-spec';

describe('agent specs', () => {
  test('DataAgent and CodingAgent expose disjoint-but-overlapping tool rosters', () => {
    expect(DataAgentSpec.tools).toContain('schema');
    expect(DataAgentSpec.tools).toContain('runQuery');
    expect(DataAgentSpec.tools).toContain('present');
    expect(DataAgentSpec.tools).not.toContain('write');
    expect(DataAgentSpec.tools).not.toContain('edit');

    expect(CodingAgentSpec.tools).toContain('write');
    expect(CodingAgentSpec.tools).toContain('edit');
    expect(CodingAgentSpec.tools).toContain('bash');
    // Coding agent can still inspect schemas / preview queries (privacy-safe).
    expect(CodingAgentSpec.tools).toContain('schema');
    expect(CodingAgentSpec.tools).toContain('describeQuery');
    expect(CodingAgentSpec.tools).not.toContain('runQuery');
    expect(CodingAgentSpec.tools).not.toContain('present');
  });

  test('both specs expose the `agent` (subagent spawn) tool', () => {
    expect(DataAgentSpec.tools).toContain('agent');
    expect(CodingAgentSpec.tools).toContain('agent');
  });

  test('both specs include todo + taskStatus for plan / background flows', () => {
    for (const spec of [DataAgentSpec, CodingAgentSpec]) {
      expect(spec.tools).toContain('todoWrite');
      expect(spec.tools).toContain('todoRead');
      expect(spec.tools).toContain('taskStatus');
    }
  });

  test('db audit agents expose PostgreSQL diagnostic tools', () => {
    expect(DbPerformanceAuditAgentSpec.tools).toContain('getTopSlowQueries');
    expect(DbPerformanceAuditAgentSpec.tools).toContain('getIndexHealth');
    expect(DbPerformanceAuditAgentSpec.tools).toContain('getReplicationHealth');
    expect(DbPerformanceAuditAgentSpec.tools).toContain('validateRemediationInGfsCli');
    // Specialist agents own their full system message (no generalist preamble).
    expect(DbPerformanceAuditAgentSpec.promptPreamble).toBeUndefined();
    expect(DbPerformanceAuditAgentSpec.systemPrompt).toContain(
      'validate_remediation_in_gfs_cli` is mandatory',
    );
    expect(DbPerformanceAuditAgentSpec.tools).not.toContain('write');

    expect(SlowQueryOptimizerAgentSpec.tools).toContain('getTopSlowQueries');
    expect(SlowQueryOptimizerAgentSpec.tools).toContain('compareQueryRewrite');
    expect(SlowQueryOptimizerAgentSpec.promptPreamble).toBeUndefined();
    expect(SlowQueryOptimizerAgentSpec.systemPrompt).toContain('Slow Query Optimizer');
    expect(SlowQueryOptimizerAgentSpec.tools).not.toContain('write');
  });

  test('audit runs at medium reasoning effort; optimizer keeps the provider default', () => {
    expect(DbPerformanceAuditAgentSpec.reasoningEffort).toBe('medium');
    expect(SlowQueryOptimizerAgentSpec.reasoningEffort).toBeUndefined();
  });

  test('audit + optimizer default to the full-screen focus layout; generalists express no preference', () => {
    expect(DbPerformanceAuditAgentSpec.defaultLayoutMode).toBe('focus');
    expect(SlowQueryOptimizerAgentSpec.defaultLayoutMode).toBe('focus');
    expect(DataAgentSpec.defaultLayoutMode).toBeUndefined();
    expect(CodingAgentSpec.defaultLayoutMode).toBeUndefined();
  });
});

describe('routeAgent heuristic', () => {
  test('data-related prompts pick DataAgent', () => {
    expect(routeAgent('combien de lignes dans la table sales').id).toBe('data');
    expect(routeAgent('top 5 customers by revenue').id).toBe('data');
    expect(routeAgent('SELECT COUNT(*) FROM users').id).toBe('data');
    expect(routeAgent('read data/sales.csv and aggregate').id).toBe('data');
  });

  test('code-related prompts pick CodingAgent', () => {
    expect(routeAgent('create a React app showing the data').id).toBe('code');
    expect(routeAgent('fix the bug in apps/dashboard/index.html').id).toBe('code');
    expect(routeAgent('write a Python script that exports JSON').id).toBe('code');
    expect(routeAgent('refactor this code').id).toBe('code');
  });

  test('db audit prompts pick db audit agents', () => {
    expect(routeAgent('run a PostgreSQL performance audit').id).toBe('db-performance-audit');
    expect(routeAgent('find bloat and replication issues').id).toBe('db-performance-audit');
    expect(routeAgent('optimize the slowest query from pg_stat_statements').id).toBe('slow-query-optimizer');
  });

  test('ambiguous prompts default to DataAgent (privacy-safe default)', () => {
    // No matching keyword on either side → ties go to data.
    expect(routeAgent('hello').id).toBe('data');
    expect(routeAgent('').id).toBe('data');
  });
});
