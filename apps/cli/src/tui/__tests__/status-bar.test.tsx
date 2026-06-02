import { describe, expect, test } from 'bun:test';
import { Box } from 'ink';
import { render } from 'ink-testing-library';
import { EMPTY_SESSION_TOTALS, StatusBar, type StatusBarProps } from '../status-bar';
import { plain } from './_ansi';

const baseProps = (over: Partial<StatusBarProps> = {}): StatusBarProps => ({
  providerLabel: 'Azure OpenAI · gpt-5.3-codex',
  totals: EMPTY_SESSION_TOTALS,
  contextLimit: 400_000,
  lastTurnInputTokens: 0,
  attachedDatasources: 0,
  agentLabel: 'DataAgent',
  agentPinned: false,
  ...over,
});

// Render inside a fixed-width column to reproduce the split-layout squeeze.
function rows(props: StatusBarProps, width: number): string[] {
  const { lastFrame } = render(
    <Box width={width}>
      <StatusBar {...props} />
    </Box>,
  );
  return plain(lastFrame())
    .split('\n')
    .filter((l) => l.trim().length > 0);
}

describe('StatusBar', () => {
  test('puts the provider label and the indicators on separate rows', () => {
    const out = rows(baseProps(), 50);
    expect(out.length).toBe(2);
    expect(out[0]).toContain('gpt-5.3-codex');
    expect(out[0]).toContain('400k ctx');
    expect(out[1]).toContain('DataAgent');
  });

  test('stays two rows in a narrow column instead of wrapping mid-word', () => {
    // Regression: the indicators defaulted to wrap="wrap" and broke onto a
    // third line ("⟳ update rea" + "dy") when the column was too narrow.
    const out = rows(
      baseProps({
        updateReady: true,
        attachedDatasources: 2,
        totals: { inputTokens: 12_000, outputTokens: 3400, totalTokens: 15_400, costUSD: 0.12 },
        lastTurnInputTokens: 8000,
      }),
      48,
    );
    expect(out.length).toBe(2);
  });

  test('falls back to a no-provider hint when none is configured', () => {
    const out = rows(baseProps({ providerLabel: null, contextLimit: null }), 50);
    expect(out[0]).toContain('no provider · /models');
  });
});
