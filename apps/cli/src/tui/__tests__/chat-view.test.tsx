import { describe, expect, test } from 'bun:test';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { ChatView } from '../chat-view';
import { plain } from './_ansi';

const makeLines = (n: number) => Array.from({ length: n }, (_, i) => <Text key={i}>{`L${i}`}</Text>);

function frame(lineCount: number, scrollOffset: number, availableHeight: number): string[] {
  const { lastFrame } = render(
    <ChatView lines={makeLines(lineCount)} scrollOffset={scrollOffset} availableHeight={availableHeight} />,
  );
  return plain(lastFrame()).split('\n');
}

describe('ChatView', () => {
  test('shows the empty-state hint when there are no lines', () => {
    expect(frame(0, 0, 20).join('\n')).toContain('Ask me about data');
  });

  test('never renders more rows than availableHeight (no overflow → no garble)', () => {
    for (const offset of [0, 5, 50, 999]) {
      const rows = frame(100, offset, 20);
      expect(rows.length).toBeLessThanOrEqual(20);
    }
  });

  test('at offset 0 it sticks to the bottom (latest line visible, nothing below)', () => {
    const rows = frame(100, 0, 20).join('\n');
    expect(rows).toContain('L99'); // newest line is shown
    expect(rows).toContain('↑'); // there is more above
    expect(rows).not.toContain('↓'); // but nothing below the bottom
  });

  test('scrolling up reveals earlier lines and shows a "below" indicator', () => {
    const rows = frame(100, 90, 20).join('\n');
    expect(rows).toContain('L0'); // reached the top
    expect(rows).toContain('more line'); // an indicator is shown
  });

  test('clamps an over-large scroll offset instead of blanking out', () => {
    const rows = frame(100, 99999, 20);
    expect(rows.length).toBeLessThanOrEqual(20);
    expect(rows.join('\n')).toContain('L0');
  });
});
