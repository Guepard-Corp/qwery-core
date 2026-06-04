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
  nextWordEnd,
  prevWordStart,
  rowColToCursor,
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

describe('word-boundary helpers', () => {
  const v = 'select * from pg_stat_statements';
  //         0123456789...        14            (len = 32)

  test('prevWordStart jumps to the start of the word at/before the caret', () => {
    expect(prevWordStart(v, v.length)).toBe(14); // from end → start of "pg_stat_statements"
    expect(prevWordStart(v, 14)).toBe(9); // → start of "from"
    expect(prevWordStart(v, 9)).toBe(7); // → "*"
    expect(prevWordStart(v, 6)).toBe(0); // mid-"select" → start
    expect(prevWordStart(v, 0)).toBe(0); // already at start
  });

  test('nextWordEnd jumps past the word at/after the caret', () => {
    expect(nextWordEnd(v, 0)).toBe(6); // past "select"
    expect(nextWordEnd(v, 6)).toBe(8); // skip space, past "*"
    expect(nextWordEnd(v, 8)).toBe(13); // past "from"
    expect(nextWordEnd(v, 13)).toBe(32); // past "pg_stat_statements" → end
    expect(nextWordEnd(v, 32)).toBe(32); // already at end
  });

  test('handles leading/trailing/multiple spaces', () => {
    expect(prevWordStart('  ab  cd  ', 10)).toBe(6); // skip trailing ws, start of "cd"
    expect(nextWordEnd('  ab  cd  ', 0)).toBe(4); // skip leading ws, past "ab"
  });
});

describe('InputBar — word navigation key bindings', () => {
  // Controlled component: capture the cursor InputBar requests via onChange.
  function press(value: string, cursor: number, seq: string): number {
    let next = cursor;
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor }}
            onChange={(s) => {
              next = s.cursor;
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

  const v = 'select * from pg_stat_statements';
  const ALT_LEFT = '\x1b[1;3D';
  const ALT_RIGHT = '\x1b[1;3C';
  const CTRL_LEFT = '\x1b[1;5D';
  const CTRL_RIGHT = '\x1b[1;5C';
  const META_B = '\x1bb';
  const META_F = '\x1bf';

  test('Alt+Left / Ctrl+Left / Meta-b jump back a word', () => {
    expect(press(v, v.length, ALT_LEFT)).toBe(14);
    expect(press(v, v.length, CTRL_LEFT)).toBe(14);
    expect(press(v, v.length, META_B)).toBe(14);
  });

  test('Alt+Right / Ctrl+Right / Meta-f jump forward a word', () => {
    expect(press(v, 0, ALT_RIGHT)).toBe(6);
    expect(press(v, 0, CTRL_RIGHT)).toBe(6);
    expect(press(v, 0, META_F)).toBe(6);
  });

  test('plain ←/→ still move by one character', () => {
    expect(press(v, 10, '\x1b[D')).toBe(9); // left
    expect(press(v, 10, '\x1b[C')).toBe(11); // right
  });
});

describe('InputBar — word deletion key bindings', () => {
  function press(value: string, cursor: number, seq: string): { value: string; cursor: number } {
    let next: { value: string; cursor: number } = { value, cursor };
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor }}
            onChange={(s) => {
              next = { value: s.value, cursor: s.cursor };
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

  const ALT_BACKSPACE = '\x1b\x7f';
  const CTRL_W = '\x17';
  const PLAIN_BACKSPACE = '\x7f';

  test('Alt+Backspace deletes the previous word', () => {
    const v = 'select * from pg_stat_statements';
    expect(press(v, v.length, ALT_BACKSPACE)).toEqual({ value: 'select * from ', cursor: 14 });
  });

  test('Ctrl+W deletes the previous word', () => {
    expect(press('drop table users', 16, CTRL_W)).toEqual({ value: 'drop table ', cursor: 11 });
  });

  test('word delete from mid-string keeps the tail', () => {
    // caret after "from" (index 13); delete back to start of "from" (9).
    expect(press('select * from users', 13, ALT_BACKSPACE)).toEqual({
      value: 'select *  users',
      cursor: 9,
    });
  });

  test('plain Backspace still deletes a single character', () => {
    expect(press('abcd', 4, PLAIN_BACKSPACE)).toEqual({ value: 'abc', cursor: 3 });
  });

  test('word delete at the start of the line is a no-op', () => {
    expect(press('abc', 0, ALT_BACKSPACE)).toEqual({ value: 'abc', cursor: 0 });
  });
});

describe('InputBar — forward delete (Delete key, distinct from Backspace)', () => {
  function press(value: string, cursor: number, seq: string): { value: string; cursor: number } {
    let next: { value: string; cursor: number } = { value, cursor };
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor }}
            onChange={(s) => {
              next = { value: s.value, cursor: s.cursor };
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

  // The Delete key sends CSI 3~, which Ink reports as key.delete (the Backspace
  // key sends 0x7f/0x08, reported as key.backspace) — so the two are distinct.
  const DELETE = '\x1b[3~';
  const BACKSPACE = '\x7f';

  test('Delete removes the character to the RIGHT of the caret, caret stays put', () => {
    expect(press('abcd', 1, DELETE)).toEqual({ value: 'acd', cursor: 1 });
  });

  test('Delete in the middle of a word removes only the char under the caret', () => {
    // caret at index 7 (the space before "*"): "select |* from t" → delete "*"
    expect(press('select * from t', 7, DELETE)).toEqual({ value: 'select  from t', cursor: 7 });
  });

  test('Delete at the end of the value is a no-op (nothing to the right)', () => {
    expect(press('abcd', 4, DELETE)).toEqual({ value: 'abcd', cursor: 4 });
  });

  test('Backspace is unaffected — still deletes the char to the LEFT', () => {
    expect(press('abcd', 2, BACKSPACE)).toEqual({ value: 'acd', cursor: 1 });
  });
});

describe('rowColToCursor — inverse of the caret mapping (↑/↓ moves)', () => {
  test('layoutInput exposes the flat start index of each visual row', () => {
    // 'a\nbb\nccc' → rows a|bb|ccc; '\n's sit at flat indices 1 and 4.
    expect(layoutInput('a\nbb\nccc', 0, 20).rowStarts).toEqual([0, 2, 5]);
    // soft-wrap: 'abcdefghij' at width 4 → abcd|efgh|ij.
    expect(layoutInput('abcdefghij', 0, 4).rowStarts).toEqual([0, 4, 8]);
  });

  test('maps a (row, col) back to its flat cursor', () => {
    const l = layoutInput('abcdefghij', 0, 4); // rows abcd|efgh|ij
    expect(rowColToCursor(l, 1, 2)).toBe(6); // 'g'
    expect(rowColToCursor(l, 2, 0)).toBe(8); // start of 'ij'
  });

  test('clamps the column to the target row length (lands at end of a shorter row)', () => {
    const l = layoutInput('longline\nx', 0, 20); // rows longline|x, rowStarts 0,9
    expect(rowColToCursor(l, 1, 99)).toBe(10); // col clamped to len('x')=1 → 9+1
  });

  test('round-trip: moving up from the last row lands one row higher', () => {
    const l = layoutInput('a\nbb\nccc', 8, 20); // caret at end of 'ccc' (row 2, col 3)
    expect([l.caretRow, l.caretCol]).toEqual([2, 3]);
    const up = rowColToCursor(l, l.caretRow - 1, l.caretCol); // → row 1, col clamped to 2
    expect(layoutInput('a\nbb\nccc', up, 20).caretRow).toBe(1);
  });
});

describe('InputBar — vertical caret movement in multi-line input (ADR U6)', () => {
  // Inject a fixed multi-line state, press one arrow, capture what InputBar
  // requests. width 40 → every short line is its own (un-wrapped) visual row.
  function press(
    value: string,
    cursor: number,
    seq: string,
    history: string[] = [],
    historyIndex: number | null = null,
  ): { value: string; cursor: number; historyIndex: number | null } {
    let next = { value, cursor, historyIndex };
    const { stdin } = render(
      <ServicesProvider services={stubServices}>
        <Box width={40} flexDirection="column">
          <InputBar
            state={{ ...EMPTY_INPUT_STATE, value, cursor, historyIndex }}
            onChange={(s) => {
              next = { value: s.value, cursor: s.cursor, historyIndex: s.historyIndex };
            }}
            onSubmit={noop}
            history={history}
            width={40}
          />
        </Box>
      </ServicesProvider>,
    );
    stdin.write(seq);
    return next;
  }

  const UP = '\x1B[A';
  const DOWN = '\x1B[B';

  test('↑ from a lower line moves the caret up WITHOUT touching the draft (U2 fix)', () => {
    // 'line1\nline2', caret at end (row 1, col 5). ↑ → row 0, col 5 (cursor 5).
    expect(press('line1\nline2', 11, UP, ['previous prompt'])).toEqual({
      value: 'line1\nline2',
      cursor: 5,
      historyIndex: null,
    });
  });

  test('↑ on the first line still recalls history (boundary fall-through)', () => {
    // caret on row 0 → no row above → history recall.
    expect(press('line1\nline2', 3, UP, ['old prompt'])).toEqual({
      value: 'old prompt',
      cursor: 'old prompt'.length,
      historyIndex: 0,
    });
  });

  test('↓ from the first line moves the caret down, preserving column', () => {
    // caret at row 0 col 2 → row 1 col 2 → cursor 8 (after "li" in line2).
    expect(press('line1\nline2', 2, DOWN)).toEqual({
      value: 'line1\nline2',
      cursor: 8,
      historyIndex: null,
    });
  });

  test('↓ clamps the column when the row below is shorter', () => {
    // caret at end of "longline" (row 0, col 8) → row 1 "x" → clamp to col 1.
    expect(press('longline\nx', 8, DOWN)).toEqual({
      value: 'longline\nx',
      cursor: 10,
      historyIndex: null,
    });
  });

  test('↓ on the last line is a no-op when not browsing history', () => {
    expect(press('line1\nline2', 11, DOWN)).toEqual({
      value: 'line1\nline2',
      cursor: 11,
      historyIndex: null,
    });
  });

  test('single-line input is unaffected — ↑ goes straight to history', () => {
    expect(press('select 1', 8, UP, ['earlier'])).toEqual({
      value: 'earlier',
      cursor: 'earlier'.length,
      historyIndex: 0,
    });
  });
});
