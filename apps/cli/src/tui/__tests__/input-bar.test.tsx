import { describe, expect, test } from 'bun:test';
import { Box } from 'ink';
import { render } from 'ink-testing-library';
import type { AppServices } from '../../services';
import { ServicesProvider } from '../../services';
import {
  EMPTY_INPUT_STATE,
  INPUT_MAX_ROWS,
  InputBar,
  type InputState,
  inputHeightRows,
  layoutInput,
} from '../input-bar';
import { plain } from './_ansi';

// InputBar only reads `logger` from services, and only inside key handlers — a
// no-op stub is enough to render it.
const noop = () => {};
const stubServices = {
  logger: { debug: noop, info: noop, warn: noop, error: noop },
} as unknown as AppServices;

// Render faithfully: the bar lives in a fixed-width COLUMN in the app, so it
// stretches to that width (a row parent would let it shrink to content).
function frame(state: InputState, width: number): string {
  const { lastFrame } = render(
    <ServicesProvider services={stubServices}>
      <Box width={width} flexDirection="column">
        <InputBar state={state} onChange={noop} onSubmit={noop} history={[]} width={width} />
      </Box>
    </ServicesProvider>,
  );
  return plain(lastFrame() ?? '').replace(/\n+$/, '');
}
const rows = (s: string) => s.split('\n').length;

describe('layoutInput — char-exact soft-wrap + caret mapping', () => {
  test('short value is one row; caret maps to its column', () => {
    const l = layoutInput('select 1', 8, 20);
    expect(l.rows).toEqual(['select 1']);
    expect([l.caretRow, l.caretCol]).toEqual([0, 8]);
  });

  test('honors explicit newlines', () => {
    const l = layoutInput('a\nbb\nccc', 3, 20); // caret after the first "b" (index 3)
    expect(l.rows).toEqual(['a', 'bb', 'ccc']);
    expect([l.caretRow, l.caretCol]).toEqual([1, 1]);
  });

  test('soft-wraps a long line at exactly `w` chars, preserving every character', () => {
    const l = layoutInput('abcdefghij', 0, 4);
    expect(l.rows).toEqual(['abcd', 'efgh', 'ij']);
    expect(l.rows.join('')).toBe('abcdefghij'); // nothing lost (incl. spaces)
  });

  test('caret at a wrap boundary lands at the start of the next row', () => {
    const l = layoutInput('abcdefgh', 4, 4); // index 4 is the first char of row 2
    expect([l.caretRow, l.caretCol]).toEqual([1, 0]);
  });

  test('caret at end of a full row sits just past the last char (no extra row)', () => {
    const l = layoutInput('abcd', 4, 4);
    expect(l.rows).toEqual(['abcd']);
    expect([l.caretRow, l.caretCol]).toEqual([0, 4]);
  });

  test('preserves runs of spaces (char-exact, not word-wrap)', () => {
    const l = layoutInput('a   b', 0, 10);
    expect(l.rows).toEqual(['a   b']);
  });
});

describe('inputHeightRows', () => {
  const W = 30; // contentWidth = 24, wrapWidth = 23

  test('a short single line is one row', () => {
    expect(inputHeightRows('select 1', W)).toBe(1);
    expect(inputHeightRows('', W)).toBe(1);
  });

  test('counts explicit newlines', () => {
    expect(inputHeightRows('a\nb\nc', W)).toBe(3);
  });

  test('counts soft-wrapped rows of a long line', () => {
    expect(inputHeightRows('x'.repeat(50), W)).toBe(Math.ceil(50 / 23));
  });

  test('caps at INPUT_MAX_ROWS', () => {
    expect(inputHeightRows('x'.repeat(10_000), W)).toBe(INPUT_MAX_ROWS);
    expect(inputHeightRows(Array(50).fill('a').join('\n'), W)).toBe(INPUT_MAX_ROWS);
  });
});

describe('InputBar — multi-line rendering', () => {
  const width = 30;

  test('short value renders one content row (3 with border)', () => {
    expect(rows(frame({ ...EMPTY_INPUT_STATE, value: 'select 1', cursor: 8 }, width))).toBe(3);
  });

  test('box height tracks inputHeightRows (content rows + 2 border rows)', () => {
    for (const value of ['select 1', 'a\nb', 'a\nb\nc\nd', 'x'.repeat(70)]) {
      const expected = inputHeightRows(value, width) + 2;
      expect(rows(frame({ ...EMPTY_INPUT_STATE, value, cursor: value.length }, width))).toBe(expected);
    }
  });

  test('explicit newlines render on separate rows with the prompt pinned', () => {
    const f = frame({ ...EMPTY_INPUT_STATE, value: 'select *\nfrom t', cursor: 14 }, width);
    expect(f).toContain('select *');
    expect(f).toContain('from t');
    expect(f).toContain('›'); // prompt present, on the first row only
  });

  test('a long line soft-wraps instead of scrolling (whole value visible)', () => {
    const value = 'select alpha, beta, gamma, delta, epsilon from a_table';
    const f = frame({ ...EMPTY_INPUT_STATE, value, cursor: value.length }, width);
    // Char-exact wrap can split a word across rows, but never drops/reorders a
    // character — so the alphanumeric stream of the value appears intact (proves
    // nothing was scrolled away).
    const stream = (s: string) => s.replace(/[^a-z0-9]/gi, '');
    expect(stream(f)).toContain(stream(value));
  });
});

describe('InputBar — newline insertion (ADR U6)', () => {
  function pressState(value: string, cursor: number, seq: string): InputState | null {
    let next: InputState | null = null;
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor }}
            onChange={(s) => {
              next = s;
            }}
            onSubmit={noop}
            history={[]}
            width={40}
          />
        </Box>
      </ServicesProvider>,
    );
    stdin.write(seq);
    return next;
  }
  function submitted(value: string, cursor: number, seq: string): string | null {
    let out: string | null = null;
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor }}
            onChange={noop}
            onSubmit={(v) => {
              out = v;
            }}
            history={[]}
            width={40}
          />
        </Box>
      </ServicesProvider>,
    );
    stdin.write(seq);
    return out;
  }

  const SHIFT_ENTER = '\x1b[13;2u';
  const ALT_ENTER = '\x1b\r';
  const ENTER = '\r';

  test('Shift+Enter inserts a newline at the caret', () => {
    expect(pressState('ab', 1, SHIFT_ENTER)).toMatchObject({ value: 'a\nb', cursor: 2 });
  });

  test('Alt+Enter inserts a newline at the caret', () => {
    expect(pressState('ab', 2, ALT_ENTER)).toMatchObject({ value: 'ab\n', cursor: 3 });
  });

  test('plain Enter submits (does not insert a newline)', () => {
    expect(submitted('select 1', 8, ENTER)).toBe('select 1');
  });

  test('a CRLF paste is normalized to LF', () => {
    expect(pressState('', 0, 'a\r\nb')).toMatchObject({ value: 'a\nb', cursor: 3 });
  });
});
