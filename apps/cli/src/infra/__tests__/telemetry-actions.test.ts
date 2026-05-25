import { describe, expect, test } from 'bun:test';
import type { Telemetry, TelemetryAttributes, ToolEvent } from '@qwery/domain';
import { NullTelemetry } from '@qwery/domain';
import { instrumentToolEvent, safeToolAttributes, trackCommand, trackShell } from '../telemetry-actions';

// Strings that must NEVER appear in any telemetry payload.
const SECRETS = [
  'SELECT ssn FROM customers',
  'bob@secret.com',
  '/Users/bob/secret.csv',
  'rm -rf /',
  'password=hunter2',
  'DROP TABLE',
  'rendered-table-with-values',
  'find the email of john',
  'analyse the salaries',
];

function assertNoSecret(value: unknown): void {
  const json = JSON.stringify(value ?? {});
  for (const secret of SECRETS) {
    expect(json).not.toContain(secret);
  }
}

// One representative ToolEvent per PII-bearing result kind.
const piiEvents: ToolEvent[] = [
  {
    id: '1',
    name: 'runQuery',
    status: 'done',
    startedAt: 0,
    endedAt: 5,
    input: { sql: 'SELECT ssn FROM customers' },
    output: {
      kind: 'runQuery',
      sql: 'SELECT ssn FROM customers',
      row: { ssn: '123-45-6789', email: 'bob@secret.com' },
      result: { columns: ['ssn'], rows: [['123-45-6789']], rowCount: 1 },
    },
  } as ToolEvent,
  {
    id: '2',
    name: 'bash',
    status: 'done',
    startedAt: 0,
    endedAt: 3,
    input: { command: 'rm -rf /' },
    output: { kind: 'bash', command: 'rm -rf /', stdout: 'password=hunter2', stderr: '', exitCode: 0 },
  } as ToolEvent,
  {
    id: '3',
    name: 'read',
    status: 'done',
    startedAt: 0,
    endedAt: 2,
    input: { path: '/Users/bob/secret.csv' },
    output: {
      kind: 'read',
      path: '/Users/bob/secret.csv',
      bytes: 42,
      truncated: false,
      preview: 'bob@secret.com',
    },
  } as ToolEvent,
  {
    id: '4',
    name: 'edit',
    status: 'done',
    startedAt: 0,
    endedAt: 4,
    input: { path: '/Users/bob/secret.csv' },
    output: {
      kind: 'edit',
      path: '/Users/bob/secret.csv',
      appliedEdits: 2,
      bytesBefore: 10,
      bytesAfter: 20,
      diff: 'DROP TABLE customers',
    },
  } as ToolEvent,
  {
    id: '5',
    name: 'present',
    status: 'done',
    startedAt: 0,
    endedAt: 6,
    input: { sql: 'SELECT ssn FROM customers' },
    output: {
      kind: 'present',
      sql: 'SELECT ssn FROM customers',
      template: 'table',
      rendered: 'rendered-table-with-values',
      result: { columns: ['ssn'], rows: [['x']], rowCount: 3 },
    },
  } as ToolEvent,
  {
    id: '6',
    name: 'searchSchema',
    status: 'done',
    startedAt: 0,
    endedAt: 1,
    input: { query: 'find the email of john' },
    output: { kind: 'searchSchema', query: 'find the email of john', available: true, tables: 4 },
  } as ToolEvent,
  {
    id: '7',
    name: 'agent',
    status: 'done',
    startedAt: 0,
    endedAt: 100,
    input: { name: 'explorer', task: 'analyse the salaries' },
    output: {
      kind: 'agent',
      subagent: 'explorer',
      task: 'analyse the salaries',
      text: 'bob@secret.com',
      durationMs: 100,
      tokens: 50,
    },
  } as ToolEvent,
];

describe('safeToolAttributes', () => {
  test('never leaks personal data for any tool kind', () => {
    for (const event of piiEvents) {
      assertNoSecret(safeToolAttributes(event));
    }
  });

  test('surfaces only safe scalars', () => {
    const runQuery = safeToolAttributes(piiEvents[0] as ToolEvent);
    expect(runQuery).toEqual({ tool: 'runQuery', status: 'done', duration_ms: 5, row_count: 1 });

    const bash = safeToolAttributes(piiEvents[1] as ToolEvent);
    expect(bash).toEqual({ tool: 'bash', status: 'done', duration_ms: 3, exit_code: 0 });

    const agent = safeToolAttributes(piiEvents[6] as ToolEvent);
    expect(agent).toEqual({ tool: 'agent', status: 'done', duration_ms: 100, tokens: 50 });
    expect(JSON.stringify(agent)).not.toContain('explorer'); // subagent name dropped
  });
});

describe('instrumentToolEvent', () => {
  test('emits invoked then completed, leaking nothing', () => {
    const captured: Array<{ name: string; props?: TelemetryAttributes }> = [];
    let spanEnds = 0;
    const telemetry: Telemetry = {
      ...NullTelemetry,
      trackEvent: (name, props) => captured.push({ name, props }),
      startSpan: () => ({
        setAttribute: () => {},
        recordError: () => {},
        end: () => {
          spanEnds += 1;
        },
      }),
    };
    const spans = new Map<string, ReturnType<Telemetry['startSpan']>>();

    const running = { ...(piiEvents[0] as ToolEvent), status: 'running' as const, endedAt: undefined };
    instrumentToolEvent(telemetry, running, spans);
    instrumentToolEvent(telemetry, piiEvents[0] as ToolEvent, spans);

    expect(captured.map((c) => c.name)).toEqual(['agent.tool.invoked', 'agent.tool.completed']);
    expect(spanEnds).toBe(1);
    expect(spans.size).toBe(0);
    for (const c of captured) assertNoSecret(c.props);
  });
});

describe('trackCommand / trackShell', () => {
  test('tracks only known slash commands, never arbitrary text', () => {
    const captured: TelemetryAttributes[] = [];
    const telemetry: Telemetry = { ...NullTelemetry, trackEvent: (_n, p) => p && captured.push(p) };

    trackCommand(telemetry, '/models');
    trackCommand(telemetry, '/notacommand secret@email.com');
    expect(captured).toEqual([{ command: '/models' }]);
  });

  test('shell tracks only the exit code', () => {
    const captured: TelemetryAttributes[] = [];
    const telemetry: Telemetry = { ...NullTelemetry, trackEvent: (_n, p) => p && captured.push(p) };
    trackShell(telemetry, 0);
    expect(captured).toEqual([{ exit_code: 0 }]);
  });
});
