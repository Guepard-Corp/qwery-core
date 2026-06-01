import { Box, Text } from 'ink';
import type { ReactNode } from 'react';

export interface ChatViewProps {
  /** The whole chat flattened to one node per terminal row (see flattenChatLines). */
  lines: ReactNode[];
  /** Rows scrolled up from the bottom. 0 sticks to the latest output. */
  scrollOffset: number;
  /**
   * Total terminal rows this view (including its own vertical padding) may
   * occupy. The view renders at most this many rows — Ink cannot reliably clip
   * vertical overflow, so we window the lines ourselves.
   */
  availableHeight: number;
}

export function ChatView({ lines, scrollOffset, availableHeight }: ChatViewProps) {
  const total = lines.length;
  const inner = Math.max(1, availableHeight - 2); // this view's own paddingY

  // `offset` counts rows up from the bottom; clamp so at least one row shows.
  const offset = Math.max(0, Math.min(scrollOffset, Math.max(0, total - 1)));
  const end = total - offset;
  const showBelow = end < total;
  // Each scroll indicator costs one row — reserve before slicing the window.
  let avail = inner - (showBelow ? 1 : 0);
  let start = Math.max(0, end - avail);
  if (start > 0) {
    avail -= 1; // make room for the "more above" indicator
    start = Math.max(0, end - avail);
  }
  const showAbove = start > 0;
  const visible = lines.slice(start, end);
  const hiddenAbove = start;
  const hiddenBelow = total - end;

  return (
    <Box flexDirection="column" paddingY={1} flexGrow={1} flexShrink={1} overflow="hidden">
      {total === 0 && (
        <Text dimColor>
          Ask me about data. Try: "what is in data/sales.csv?" or "top 3 countries by revenue".
        </Text>
      )}
      {showAbove && (
        <Text dimColor>
          ↑ {hiddenAbove} more line{hiddenAbove === 1 ? '' : 's'} above — Shift+↑ to scroll up
        </Text>
      )}
      {visible.map((node, i) => (
        <Box key={start + i}>{node}</Box>
      ))}
      {showBelow && (
        <Text dimColor>
          ↓ {hiddenBelow} more line{hiddenBelow === 1 ? '' : 's'} below — Shift+↓ to scroll down
        </Text>
      )}
    </Box>
  );
}
