import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { listLocalSubagents, type SubagentSummary } from '../infra/subagents';

interface AgentsOverlayProps {
  onClose: () => void;
}

type Mode = { kind: 'list'; cursor: number } | { kind: 'view'; cursor: number; subagent: SubagentSummary };

const VISIBLE = 12;

export function AgentsOverlay({ onClose }: AgentsOverlayProps) {
  const [subagents, setSubagents] = useState<SubagentSummary[] | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list', cursor: 0 });
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void listLocalSubagents().then((list) => {
      if (!cancelled) setSubagents(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      if (mode.kind === 'view') setMode({ kind: 'list', cursor: mode.cursor });
      else onClose();
      return;
    }
    if (mode.kind === 'view') {
      if (key.return) setMode({ kind: 'list', cursor: mode.cursor });
      return;
    }
    if (!subagents || subagents.length === 0) return;
    if (key.upArrow) {
      const next = Math.max(0, mode.cursor - 1);
      setMode({ kind: 'list', cursor: next });
      if (next < windowStart) setWindowStart(next);
    } else if (key.downArrow) {
      const next = Math.min(subagents.length - 1, mode.cursor + 1);
      setMode({ kind: 'list', cursor: next });
      if (next >= windowStart + VISIBLE) setWindowStart(next - VISIBLE + 1);
    } else if (key.return && subagents[mode.cursor]) {
      setMode({ kind: 'view', cursor: mode.cursor, subagent: subagents[mode.cursor]! });
    }
  });

  if (subagents === null) {
    return (
      <Box borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Text dimColor>Loading subagents…</Text>
      </Box>
    );
  }

  if (mode.kind === 'view') {
    const sa = mode.subagent;
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Box justifyContent="space-between">
          <Text bold>
            {sa.name} <Text dimColor>[{sa.baseAgent}]</Text>
          </Text>
          <Text dimColor>esc / enter back</Text>
        </Box>
        <Box marginY={1} flexDirection="column">
          <Text>{sa.description}</Text>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Scope:</Text>
          <Text> {sa.scope}</Text>
          <Text dimColor>Path:</Text>
          <Text> {sa.path}</Text>
          {sa.tools && (
            <>
              <Text dimColor>Tools:</Text>
              <Text> {sa.tools.join(', ')}</Text>
            </>
          )}
          {sa.model && (
            <>
              <Text dimColor>Model override:</Text>
              <Text> {sa.model}</Text>
            </>
          )}
        </Box>
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>Prompt:</Text>
          <Text>{sa.prompt}</Text>
        </Box>
      </Box>
    );
  }

  if (subagents.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Box justifyContent="space-between">
          <Text bold>Subagents</Text>
          <Text dimColor>esc</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>No persisted subagents yet.</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Place a markdown file under:</Text>
            <Text dimColor> .qwery/agents/&lt;slug&gt;.md (workspace)</Text>
            <Text dimColor> ~/.qwery/agents/&lt;slug&gt;.md (user)</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Frontmatter: name, description, agent (data|code), optional tools[].</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const visible = subagents.slice(windowStart, windowStart + VISIBLE);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>Subagents</Text>
        <Text dimColor>esc</Text>
      </Box>
      <Box marginY={1}>
        <Text dimColor>
          ↑/↓ navigate · enter inspect · {subagents.length} subagent{subagents.length === 1 ? '' : 's'}
        </Text>
      </Box>
      {windowStart > 0 && <Text dimColor> ↑ {windowStart} earlier</Text>}
      {visible.map((sa, i) => {
        const idx = windowStart + i;
        const selected = idx === mode.cursor;
        return (
          <Box key={sa.path} flexDirection="column">
            <Box>
              <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                {' '}
                {sa.name}{' '}
              </Text>
              <Text dimColor> [{sa.baseAgent}]</Text>
              <Text dimColor> ·{sa.scope}</Text>
            </Box>
            {selected && (
              <Box paddingLeft={2}>
                <Text dimColor>{sa.description}</Text>
              </Box>
            )}
          </Box>
        );
      })}
      {windowStart + VISIBLE < subagents.length && (
        <Text dimColor> ↓ {subagents.length - windowStart - VISIBLE} more</Text>
      )}
    </Box>
  );
}
