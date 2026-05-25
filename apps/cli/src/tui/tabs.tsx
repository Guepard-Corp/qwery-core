import { Box, Text } from 'ink';

export type TabKey = 'chat' | 'results';

export interface Tab {
  key: TabKey;
  label: string;
  badge?: boolean;
}

export function TabBar({ active, tabs }: { active: TabKey; tabs: Tab[] }) {
  return (
    <Box borderStyle="single" borderBottom borderTop={false} borderLeft={false} borderRight={false}>
      {tabs.map((t, i) => (
        <Box key={t.key} marginRight={2}>
          <Text color={active === t.key ? 'cyan' : 'gray'} bold={active === t.key}>
            {active === t.key ? '▸ ' : '  '}
            {t.label}
            {t.badge ? ' ●' : ''}
            {i < tabs.length - 1 ? '' : ''}
          </Text>
        </Box>
      ))}
      <Box flexGrow={1} />
      <Text dimColor>Tab: switch · Ctrl+C: quit</Text>
    </Box>
  );
}
