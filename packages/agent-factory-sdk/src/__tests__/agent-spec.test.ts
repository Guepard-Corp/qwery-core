import { describe, expect, test } from 'bun:test';
import { CodingAgentSpec, DataAgentSpec, routeAgent } from '../agent-spec';

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

  test('ambiguous prompts default to DataAgent (privacy-safe default)', () => {
    // No matching keyword on either side → ties go to data.
    expect(routeAgent('hello').id).toBe('data');
    expect(routeAgent('').id).toBe('data');
  });
});
