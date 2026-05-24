import { describe, expect, test } from 'bun:test';
import { buildSystemPrompt, SYSTEM_PROMPT } from '../system-prompt';

describe('buildSystemPrompt', () => {
  test('returns SYSTEM_PROMPT unchanged when no context is provided', () => {
    expect(buildSystemPrompt()).toBe(SYSTEM_PROMPT);
  });

  test('returns SYSTEM_PROMPT unchanged when all context blocks are empty', () => {
    expect(buildSystemPrompt({ datasources: [], apps: [], skills: [] })).toBe(SYSTEM_PROMPT);
  });

  test('prepends an agent preamble', () => {
    const out = buildSystemPrompt({ agentPreamble: 'You are the data agent.' });
    expect(out.startsWith('You are the data agent.')).toBe(true);
    expect(out).toContain(SYSTEM_PROMPT);
  });

  test('renders attached datasources with their columns', () => {
    const out = buildSystemPrompt({
      datasources: [
        {
          name: 'sales',
          provider: 'postgres',
          tables: [{ path: 'orders', columns: [{ name: 'id', type: 'BIGINT' }] }],
        },
      ],
    });
    expect(out).toContain('Available datasources');
    expect(out).toContain('sales (postgres): orders');
    expect(out).toContain('id (BIGINT)');
  });

  test('renders a datasource with no tables', () => {
    const out = buildSystemPrompt({
      datasources: [{ name: 'sales', provider: 'pg', tables: [] }],
    });
    expect(out).toContain('sales (pg): no tables');
  });

  test('lists existing local apps with their files', () => {
    const out = buildSystemPrompt({
      apps: [{ slug: 'sales-dashboard', files: ['index.html', 'data.json'], truncated: false }],
    });
    expect(out).toContain('apps/sales-dashboard/');
    expect(out).toContain('index.html');
  });

  test('marks truncated app file lists with an ellipsis', () => {
    const out = buildSystemPrompt({
      apps: [{ slug: 'big', files: ['a.html'], truncated: true }],
    });
    expect(out).toMatch(/big\/ — a\.html …/);
  });

  test('emits "(empty)" for an app with no files', () => {
    const out = buildSystemPrompt({
      apps: [{ slug: 'x', files: [], truncated: false }],
    });
    expect(out).toContain('apps/x/ — (empty)');
  });

  test('renders skills block when skills are provided', () => {
    const out = buildSystemPrompt({
      skills: [{ name: 'forecast', description: 'time-series helper', path: '.qwery/skills/forecast.md' }],
    });
    expect(out).toContain('Available skills');
    expect(out).toContain('forecast');
    expect(out).toContain('.qwery/skills/forecast.md');
  });

  test('subagents=undefined skips the subagents block entirely', () => {
    const out = buildSystemPrompt({});
    expect(out).not.toContain('Subagents');
  });

  test('subagents=[] still renders the block with a "No persisted" note', () => {
    const out = buildSystemPrompt({ subagents: [] });
    expect(out).toContain('Subagents');
    expect(out).toContain('No persisted subagents');
  });

  test('subagents with entries are listed with their baseAgent tag', () => {
    const out = buildSystemPrompt({
      subagents: [
        { name: 'sql-optimizer', description: 'Optimises SQL', baseAgent: 'data' },
        { name: 'reviewer', description: 'Reviews diffs' },
      ],
    });
    expect(out).toContain('sql-optimizer [data] — Optimises SQL');
    expect(out).toContain('reviewer — Reviews diffs');
  });
});
