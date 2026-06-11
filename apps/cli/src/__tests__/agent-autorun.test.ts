import { describe, expect, test } from 'bun:test';
import { AGENT_AUTORUN_PROMPTS, autoRunPromptFor } from '../agent-autorun';

describe('autoRunPromptFor', () => {
  test('specialist agents auto-run their seed prompt', () => {
    expect(autoRunPromptFor('db-performance-audit')).toBe(AGENT_AUTORUN_PROMPTS['db-performance-audit']);
    expect(autoRunPromptFor('slow-query-optimizer')).toBe(AGENT_AUTORUN_PROMPTS['slow-query-optimizer']);
    // The seeds carry their intent so the agent has a concrete task.
    expect(autoRunPromptFor('db-performance-audit')).toContain('performance audit');
    expect(autoRunPromptFor('slow-query-optimizer')).toContain('slowest');
  });

  test('generalist agents are pin-only (no auto-run)', () => {
    expect(autoRunPromptFor('data')).toBeUndefined();
    expect(autoRunPromptFor('code')).toBeUndefined();
  });

  test('unpinning (null) never auto-runs', () => {
    expect(autoRunPromptFor(null)).toBeUndefined();
  });
});
