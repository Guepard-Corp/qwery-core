import type { ToolEvent, ToolName } from '@qwery/domain';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

const PRIVACY_SAFE: Set<ToolName> = new Set([
  'schema',
  'searchSchema',
  'expandSchema',
  'describeQuery',
  'present',
  'validateQuery',
]);

/** User-facing labels — the LLM tool IDs stay technical (system-prompt, ADRs). */
const LABEL: Record<ToolName, string> = {
  schema: 'Schema',
  searchSchema: 'Search',
  expandSchema: 'Expand',
  runQuery: 'Query',
  describeQuery: 'Describe',
  present: 'Present',
  bash: 'Bash',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  agent: 'Agent',
  taskStatus: 'TaskStatus',
  todoWrite: 'TodoWrite',
  todoRead: 'TodoRead',
  validateQuery: 'Validate',
};

function preview(event: ToolEvent): string {
  const input = event.input as Record<string, unknown>;
  if (event.name === 'schema') return String(input.target ?? '');
  if (event.name === 'runQuery' || event.name === 'describeQuery' || event.name === 'present') {
    const sql = String(input.sql ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    return sql.length > 60 ? `${sql.slice(0, 59)}…` : sql;
  }
  if (event.name === 'bash') {
    const cmd = String(input.command ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    return cmd.length > 60 ? `${cmd.slice(0, 59)}…` : cmd;
  }
  if (event.name === 'read' || event.name === 'write' || event.name === 'edit') {
    return String(input.path ?? '');
  }
  if (event.name === 'agent') {
    const sub = String(input.name ?? '');
    const task = String(input.task ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const taskPreview = task.length > 40 ? `${task.slice(0, 39)}…` : task;
    return taskPreview ? `${sub}: ${taskPreview}` : sub;
  }
  return '';
}

function elapsed(event: ToolEvent): string {
  const end = event.endedAt ?? Date.now();
  const ms = end - event.startedAt;
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function meta(event: ToolEvent): string {
  const out = event.output;
  if (!out || out.kind === 'error') return '';
  if (out.kind === 'schema') return `${out.schema.columns.length} cols`;
  if (out.kind === 'describeQuery') return `${out.schema.columns.length} cols`;
  if (out.kind === 'runQuery') return '1 row';
  if (out.kind === 'present') return `${out.result.rowCount} rows`;
  if (out.kind === 'bash') return `exit ${out.exitCode}`;
  if (out.kind === 'read') return fmtBytes(out.bytes) + (out.truncated ? ' · truncated' : '');
  if (out.kind === 'write') return fmtBytes(out.bytes);
  if (out.kind === 'edit') {
    const delta = out.bytesAfter - out.bytesBefore;
    const sign = delta >= 0 ? '+' : '';
    return `${out.appliedEdits} edit${out.appliedEdits === 1 ? '' : 's'} · ${sign}${delta} B`;
  }
  if (out.kind === 'agent') {
    const sec = (out.durationMs / 1000).toFixed(1);
    const tok = out.tokens >= 1000 ? `${(out.tokens / 1000).toFixed(1)}k` : String(out.tokens);
    return `${sec}s · ${tok} tok`;
  }
  return '';
}

const HOTKEY: Record<ToolName, string> = {
  schema: '⌃I',
  searchSchema: '',
  expandSchema: '',
  runQuery: '',
  describeQuery: '',
  present: '⌃R',
  bash: '',
  read: '',
  write: '',
  edit: '',
  agent: '',
  taskStatus: '',
  todoWrite: '',
  todoRead: '',
  validateQuery: '',
};

export function ToolCall({ event }: { event: ToolEvent }) {
  const color = event.status === 'done' ? 'green' : event.status === 'error' ? 'red' : 'yellow';
  const glyph = event.status === 'running' ? null : event.status === 'done' ? '✓' : '✗';

  const safe = PRIVACY_SAFE.has(event.name);
  const lockPrefix = safe ? <Text color="green">🔒 </Text> : <Text> </Text>;
  const label = LABEL[event.name];

  if (event.status === 'error' && event.output?.kind === 'error') {
    return (
      <Box>
        {lockPrefix}
        <Text color={color}>✗ </Text>
        <Text bold>{label}</Text>
        <Text dimColor> {elapsed(event)} </Text>
        <Text color="red">{event.output.message}</Text>
      </Box>
    );
  }

  const hotkey = HOTKEY[event.name];
  const showSqlHotkey = event.name === 'present' || event.name === 'runQuery';

  return (
    <Box>
      {lockPrefix}
      <Text color={color}>{glyph ?? <Spinner type="dots" />} </Text>
      <Text color={color} bold>
        {label}
      </Text>
      <Text dimColor>
        {'  '}
        {elapsed(event)}
      </Text>
      {meta(event) && (
        <Text dimColor>
          {'  '}
          {meta(event)}
        </Text>
      )}
      <Text dimColor>{'  '}</Text>
      <Text>{preview(event)}</Text>
      {(hotkey || showSqlHotkey) && (
        <Text dimColor>
          {'    '}
          {hotkey}
          {showSqlHotkey ? (hotkey ? ' ⌃L' : '⌃L') : ''}
        </Text>
      )}
    </Box>
  );
}
