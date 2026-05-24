import { Box, Text } from 'ink';

export interface SchemaColumn {
  name: string;
  type: string;
}

export function SchemaTable({ columns }: { columns: SchemaColumn[] }) {
  if (columns.length === 0) return <Text dimColor>(no columns)</Text>;
  const nameW = Math.max(...columns.map((c) => c.name.length), 4);
  const typeW = Math.max(...columns.map((c) => c.type.length), 4);
  return (
    <Box flexDirection="column">
      <Box>
        <Box width={nameW + 2}>
          <Text bold color="cyan">
            Column
          </Text>
        </Box>
        <Text bold color="cyan">
          Type
        </Text>
      </Box>
      <Text dimColor>{'─'.repeat(nameW + typeW + 4)}</Text>
      {columns.map((c) => (
        <Box key={c.name}>
          <Box width={nameW + 2}>
            <Text>{c.name}</Text>
          </Box>
          <Text color="blue">{c.type}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          {columns.length} column{columns.length === 1 ? '' : 's'}
        </Text>
      </Box>
    </Box>
  );
}
