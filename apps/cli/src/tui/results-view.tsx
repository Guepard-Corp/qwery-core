import type { ToolEvent } from '@qwery/domain';
import { Box, Text } from 'ink';
import { SchemaTable } from './schema-view';
import { SqlHighlight } from './sql-highlight';
import { Table } from './table';

export type ResultViewMode = 'data' | 'schema' | 'sql';

export function ResultsView({ event, mode }: { event: ToolEvent | null; mode: ResultViewMode }) {
  if (!event) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No result yet.{'\n'}⌃R last present · ⌃I last schema · ⌃L toggle SQL view</Text>
      </Box>
    );
  }
  if (event.status === 'running') {
    return (
      <Box paddingY={1}>
        <Text color="yellow">Running {event.name}…</Text>
      </Box>
    );
  }
  if (event.status === 'error' || event.output?.kind === 'error') {
    return (
      <Box paddingY={1} flexDirection="column">
        <Text color="red" bold>
          {event.name} failed
        </Text>
        <Text>{event.output?.kind === 'error' ? event.output.message : 'Unknown error'}</Text>
      </Box>
    );
  }
  const out = event.output;
  if (!out) return null;

  // SQL view (Ctrl+L) — works on any tool that has an sql input
  if (mode === 'sql') {
    const sql =
      out.kind === 'runQuery' || out.kind === 'describeQuery' || out.kind === 'present' ? out.sql : null;
    if (sql) {
      return (
        <Box paddingY={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan" bold>
              {event.name}
            </Text>
            <Text dimColor> · ⌃R back to result</Text>
          </Box>
          <SqlHighlight sql={sql} />
          {out.kind === 'present' && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>template:</Text>
              <Text>{out.template}</Text>
            </Box>
          )}
        </Box>
      );
    }
  }

  // Schema views
  if (
    (mode === 'schema' || out.kind === 'schema' || out.kind === 'describeQuery') &&
    (out.kind === 'schema' || out.kind === 'describeQuery')
  ) {
    return (
      <Box paddingY={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            {event.name}
          </Text>
          {out.kind === 'schema' && <Text dimColor> · {out.target}</Text>}
          {out.kind === 'describeQuery' && <Text dimColor> · output schema</Text>}
        </Box>
        <SchemaTable columns={out.schema.columns} />
      </Box>
    );
  }

  // runQuery — scalar(s)
  if (out.kind === 'runQuery') {
    const entries = Object.entries(out.row);
    return (
      <Box paddingY={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            runQuery
          </Text>
          <Text dimColor> · ⌃L view SQL</Text>
        </Box>
        {entries.map(([k, v]) => (
          <Box key={k}>
            <Text color="cyan">{k}</Text>
            <Text dimColor> = </Text>
            <Text bold>{String(v)}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text dimColor>{out.result.durationMs} ms</Text>
        </Box>
      </Box>
    );
  }

  // present — full table + rendered template preview
  if (out.kind === 'present') {
    return (
      <Box paddingY={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            present
          </Text>
          <Text dimColor> · ⌃L view SQL</Text>
        </Box>
        <Table result={out.result} />
      </Box>
    );
  }

  return null;
}
