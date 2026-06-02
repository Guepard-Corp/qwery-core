import { Box, Text } from 'ink';

export interface SessionTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
}

export const EMPTY_SESSION_TOTALS: SessionTotals = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  costUSD: 0,
};

function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function fmtCost(c: number): string {
  if (c === 0) return '$0';
  if (c < 0.01) return `$${c.toFixed(4)}`;
  if (c < 1) return `$${c.toFixed(3)}`;
  return `$${c.toFixed(2)}`;
}

const BAR_WIDTH = 12;

function renderBar(ratio: number): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round(ratio * BAR_WIDTH)));
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function ContextBar({ used, limit }: { used: number; limit: number }) {
  const ratio = Math.max(0, Math.min(1, used / limit));
  const pct = Math.round(ratio * 100);
  const color = ratio > 0.85 ? 'red' : ratio > 0.7 ? 'yellow' : 'cyan';
  return (
    <Box>
      <Text dimColor>ctx </Text>
      <Text color={color}>[{renderBar(ratio)}]</Text>
      <Text dimColor> {pct}%</Text>
    </Box>
  );
}

export interface StatusBarProps {
  providerLabel: string | null;
  totals: SessionTotals;
  contextLimit: number | null;
  /** Input tokens of the latest turn (proxy for current context fill). */
  lastTurnInputTokens: number;
  attachedDatasources: number;
  agentLabel: string;
  agentPinned: boolean;
  /** Open vs total todos for the current session (omitted when total = 0). */
  todos?: { open: number; total: number };
  /** A newer release is staged and will apply on next launch (ADR #37). */
  updateReady?: boolean;
}

export function StatusBar({
  providerLabel,
  totals,
  contextLimit,
  lastTurnInputTokens,
  attachedDatasources,
  agentLabel,
  agentPinned,
  todos,
  updateReady,
}: StatusBarProps) {
  const hasUsage = totals.totalTokens > 0;
  const labelWithCtx = providerLabel
    ? contextLimit
      ? `${providerLabel} (${fmtTokens(contextLimit)} ctx)`
      : providerLabel
    : 'no provider · /models';

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Two rows so the bar fits the half-width column in split layout (UI
          decision U1) without the indicators wrapping mid-word: the label owns
          row 1, the right-aligned indicators own row 2 and truncate not wrap. */}
      <Box>
        <Text dimColor wrap="truncate-end">
          {labelWithCtx}
        </Text>
      </Box>
      <Box>
        <Box flexShrink={1} minWidth={0}>
          <Text color="magenta" bold wrap="truncate-end">
            {agentLabel}
          </Text>
          {agentPinned && (
            <Text dimColor wrap="truncate-end">
              {' '}
              ·pinned
            </Text>
          )}
        </Box>
        <Box flexGrow={1} />
        {updateReady && (
          <Box marginLeft={2} flexShrink={0}>
            <Text color="yellow" wrap="truncate-end">
              ⟳ update ready
            </Text>
            <Text dimColor wrap="truncate-end">
              {' '}
              · /update
            </Text>
          </Box>
        )}
        {todos && todos.total > 0 && (
          <Box marginLeft={2} flexShrink={0}>
            <Text color={todos.open > 0 ? 'yellow' : 'green'} wrap="truncate-end">
              ☐ {todos.total - todos.open}/{todos.total}
            </Text>
            <Text dimColor wrap="truncate-end">
              {' '}
              todos
            </Text>
          </Box>
        )}
        {attachedDatasources > 0 && (
          <Box marginLeft={2} flexShrink={0}>
            <Text color="green" wrap="truncate-end">
              🛢 {attachedDatasources}
            </Text>
            <Text dimColor wrap="truncate-end">
              {' '}
              {attachedDatasources === 1 ? 'datasource' : 'datasources'}
            </Text>
          </Box>
        )}
        {contextLimit && lastTurnInputTokens > 0 && (
          <Box marginLeft={2} flexShrink={0}>
            <ContextBar used={lastTurnInputTokens} limit={contextLimit} />
          </Box>
        )}
        {hasUsage ? (
          <Box marginLeft={2} flexShrink={0}>
            <Text dimColor wrap="truncate-end">
              ↓ {fmtTokens(totals.inputTokens)} · ↑ {fmtTokens(totals.outputTokens)} ·{' '}
              <Text color="cyan">{fmtCost(totals.costUSD)}</Text>
            </Text>
          </Box>
        ) : (
          <Box marginLeft={2} flexShrink={0}>
            <Text dimColor wrap="truncate-end">
              ready
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
