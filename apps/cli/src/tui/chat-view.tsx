import { TABLE_SENTINEL } from '@qwery/agent-factory-sdk';
import type { QueryResult } from '@qwery/domain';
import { Box, Text } from 'ink';
import type React from 'react';
import type { ChatEntry } from '../chat-entry';
import { Markdown } from './markdown';
import { Table } from './table';
import { ToolCall } from './tool-call';

/** Maximum chat entries rendered in the live area. Pinned conservative to
 *  guarantee no overlap with the input bar / status bar / right pane. */
export const CHAT_WINDOW_SIZE = 6;

function RenderedEntry({
  text,
  result,
  availableWidth,
}: {
  text: string;
  result: QueryResult;
  availableWidth: number;
}) {
  const parts = text.split(TABLE_SENTINEL);
  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      paddingLeft={1}
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor="cyan"
    >
      {parts.map((part, i) => (
        <Box key={i} flexDirection="column">
          {part.length > 0 && <Markdown text={part} availableWidth={availableWidth} />}
          {i < parts.length - 1 && (
            <Box>
              <Table result={result} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

function renderEntry(e: ChatEntry, i: number, availableWidth: number): React.ReactElement {
  if (e.kind === 'user') {
    return (
      <Box key={i} marginBottom={1}>
        <Text color="magenta" bold>
          {'> '}
        </Text>
        <Text>{e.text}</Text>
      </Box>
    );
  }
  if (e.kind === 'assistant') {
    return (
      <Box key={i} marginBottom={1}>
        <Markdown text={e.text} availableWidth={availableWidth} />
      </Box>
    );
  }
  if (e.kind === 'rendered') {
    return <RenderedEntry key={i} text={e.text} result={e.result} availableWidth={availableWidth} />;
  }
  if (e.kind === 'shell') {
    return (
      <Box
        key={i}
        flexDirection="column"
        marginBottom={1}
        paddingLeft={1}
        borderStyle="single"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderColor="red"
      >
        <Box>
          <Text color="red" bold>
            {'! '}
          </Text>
          <Text>{e.command}</Text>
          {e.exitCode !== 0 && <Text color="red"> (exit {e.exitCode})</Text>}
        </Box>
        {e.output.length > 0 && <Text dimColor>{e.output}</Text>}
      </Box>
    );
  }
  return (
    <Box key={i} marginBottom={1}>
      <ToolCall event={e.event} />
    </Box>
  );
}

export interface ChatViewProps {
  entries: ChatEntry[];
  streaming?: string;
  /** Number of entries hidden below the visible window (for scroll-back). */
  scrollOffset: number;
  /** Width budget for the chat pane — drives table fallback decisions. */
  availableWidth: number;
}

export function ChatView({ entries, streaming, scrollOffset, availableWidth }: ChatViewProps) {
  const n = entries.length;
  const offset = Math.max(0, Math.min(scrollOffset, Math.max(0, n - CHAT_WINDOW_SIZE)));
  const end = n - offset;
  const start = Math.max(0, end - CHAT_WINDOW_SIZE);
  const window = entries.slice(start, end);
  const hiddenAbove = start;
  const hiddenBelow = n - end;
  const showStreaming = streaming !== undefined && streaming.length > 0 && offset === 0;

  return (
    <Box flexDirection="column" paddingY={1} flexGrow={1} flexShrink={1}>
      {entries.length === 0 && !streaming && (
        <Text dimColor>
          Ask me about data. Try: "what is in data/sales.csv?" or "top 3 countries by revenue".
        </Text>
      )}
      {hiddenAbove > 0 && (
        <Box marginBottom={1}>
          <Text dimColor>
            ↑ {hiddenAbove} earlier message{hiddenAbove === 1 ? '' : 's'} (Shift+↑ to scroll up)
          </Text>
        </Box>
      )}
      {window.map((e, i) => renderEntry(e, start + i, availableWidth))}
      {hiddenBelow > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            ↓ {hiddenBelow} newer message{hiddenBelow === 1 ? '' : 's'} (Shift+↓ to scroll down)
          </Text>
        </Box>
      )}
      {showStreaming && (
        <Box marginBottom={1} flexDirection="column">
          <Markdown text={streaming ?? ''} availableWidth={availableWidth} />
          <Text color="gray">▎</Text>
        </Box>
      )}
    </Box>
  );
}
