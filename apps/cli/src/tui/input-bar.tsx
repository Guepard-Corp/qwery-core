import { matchCommands, type SlashCommand } from '@qwery/domain';
import { Box, Text, useInput } from 'ink';
import { useMemo } from 'react';
import { useServices } from '../services';

export interface InputState {
  value: string;
  cursor: number;
  historyIndex: number | null;
  suggestionIndex: number;
}

export const EMPTY_INPUT_STATE: InputState = {
  value: '',
  cursor: 0,
  historyIndex: null,
  suggestionIndex: 0,
};

const isSpace = (ch: string | undefined): boolean => ch === undefined || /\s/.test(ch);

/**
 * Start of the whitespace-delimited word at or before `cursor` — the target for
 * a backward word jump (Alt/Ctrl+← or Meta-b). Skips any whitespace to the left
 * of the caret, then the run of non-whitespace before it.
 */
export function prevWordStart(value: string, cursor: number): number {
  let i = Math.min(cursor, value.length);
  while (i > 0 && isSpace(value[i - 1])) i--;
  while (i > 0 && !isSpace(value[i - 1])) i--;
  return i;
}

/**
 * Index just past the whitespace-delimited word at or after `cursor` — the
 * target for a forward word jump (Alt/Ctrl+→ or Meta-f). Skips whitespace to the
 * right of the caret, then the run of non-whitespace after it.
 */
export function nextWordEnd(value: string, cursor: number): number {
  const n = value.length;
  let i = Math.max(0, cursor);
  while (i < n && isSpace(value[i])) i++;
  while (i < n && !isSpace(value[i])) i++;
  return i;
}

/** Most content rows the input box shows before it scrolls internally, so a
 *  huge paste can't push the chat off-screen. */
export const INPUT_MAX_ROWS = 6;

/** Columns available for the value text inside the box, after the border (2),
 *  horizontal padding (2) and the `› ` prompt gutter (2). */
function contentWidth(paneWidth: number | undefined): number {
  return Math.max(4, (paneWidth ?? 80) - 4 - 2);
}

/** Soft-wrap width: one column narrower than the content area so a full row
 *  *plus* an end-of-line block caret still fits without Ink re-wrapping. */
function wrapWidth(paneWidth: number | undefined): number {
  return Math.max(1, contentWidth(paneWidth) - 1);
}

export interface InputLayout {
  /** Visual rows: char-exact soft-wrapped slices of the value (one per screen row). */
  rows: string[];
  /** Row index of the caret within {@link rows}. */
  caretRow: number;
  /** Column of the caret within `rows[caretRow]` (0..row length). */
  caretCol: number;
  /** Flat index into `value` where each visual row begins (for ↑/↓ caret moves). */
  rowStarts: number[];
}

/**
 * Char-exact soft-wrap of `value` (honoring embedded `\n`) to `w` columns,
 * reporting the caret's visual position. Char-exact rather than word-wrap so
 * every typed character — including runs of spaces — is preserved verbatim and
 * the caret maps back to an exact (row, col).
 */
export function layoutInput(value: string, cursor: number, w: number): InputLayout {
  const width = Math.max(1, w);
  const rows: string[] = [];
  const rowStarts: number[] = [];
  let caretRow = 0;
  let caretCol = 0;
  let placed = false;
  let offset = 0; // index in `value` at the start of the current logical line
  for (const line of value.split('\n')) {
    const chunks = Math.max(1, Math.ceil(line.length / width));
    for (let ci = 0; ci < chunks; ci++) {
      const s = ci * width;
      const text = line.slice(s, s + width);
      const rowIndex = rows.length;
      rows.push(text);
      rowStarts.push(offset + s);
      if (!placed) {
        const caretInLine = cursor - offset;
        if (caretInLine >= s && caretInLine <= s + text.length) {
          const col = caretInLine - s;
          // A caret sitting exactly at the wrap column belongs to the next
          // chunk's start, except on a line's final chunk (caret past last char).
          if (!(col === width && ci < chunks - 1)) {
            caretRow = rowIndex;
            caretCol = col;
            placed = true;
          }
        }
      }
    }
    offset += line.length + 1; // + the consumed '\n'
  }
  if (!placed) {
    caretRow = Math.max(0, rows.length - 1);
    caretCol = rows[caretRow]?.length ?? 0;
  }
  return { rows, caretRow, caretCol, rowStarts };
}

/**
 * Flat cursor index for a visual (row, col) in a laid-out value — the inverse of
 * {@link layoutInput}'s caret mapping, used to move the caret between rows with
 * ↑/↓. The column is clamped to the target row's length, so moving onto a shorter
 * row lands the caret at its end (the familiar editor behaviour).
 */
export function rowColToCursor(layout: InputLayout, row: number, col: number): number {
  const r = Math.max(0, Math.min(row, layout.rows.length - 1));
  const text = layout.rows[r] ?? '';
  const c = Math.max(0, Math.min(col, text.length));
  return (layout.rowStarts[r] ?? 0) + c;
}

/**
 * Visible content rows the input occupies (1..{@link INPUT_MAX_ROWS}). The app
 * uses this to reserve exactly the right chat height, so the bottom cluster
 * never overflows the viewport (ADR U12) as the input grows.
 */
export function inputHeightRows(value: string, paneWidth: number | undefined): number {
  const w = wrapWidth(paneWidth);
  let n = 0;
  for (const line of value.split('\n')) n += Math.max(1, Math.ceil(line.length / w));
  return Math.min(INPUT_MAX_ROWS, Math.max(1, n));
}

export interface InputBarProps {
  state: InputState;
  onChange: (next: InputState) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  history: string[];
  /** Width (in columns) of the column the bar lives in — sizes the wrap/window.
   *  Falls back to 80 when unknown. */
  width?: number;
}

export function InputBar({ state, onChange, onSubmit, disabled, history, width }: InputBarProps) {
  const { value, cursor, historyIndex, suggestionIndex } = state;
  const { logger } = useServices();
  const suggestions: SlashCommand[] = useMemo(() => matchCommands(value), [value]);
  const inSlashMode = suggestions.length > 0;
  // A line starting with `!` is executed as a shell command, not sent to the agent.
  const inShellMode = value.startsWith('!');

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      // Shift+Enter / Alt+Enter insert a newline (multi-line input, ADR U6);
      // plain Enter submits. (A bare LF — Ctrl+J or a multi-line paste — arrives
      // as text input, not key.return, and is inserted by the text branch below.)
      if (key.shift || key.meta) {
        onChange({
          ...state,
          value: value.slice(0, cursor) + '\n' + value.slice(cursor),
          cursor: cursor + 1,
          suggestionIndex: 0,
        });
        return;
      }
      if (inSlashMode) {
        const chosen = suggestions[suggestionIndex] ?? suggestions[0]!;
        onSubmit(chosen.label);
        onChange(EMPTY_INPUT_STATE);
        return;
      }
      const submitted = value.trim();
      if (submitted.length === 0) return;
      onSubmit(submitted);
      onChange(EMPTY_INPUT_STATE);
      return;
    }

    if (key.upArrow && !key.shift) {
      logger.debug('input.upArrow', {
        inSlashMode,
        historyLength: history.length,
        historyIndex,
        valueLength: value.length,
        disabled,
      });
      if (inSlashMode) {
        onChange({ ...state, suggestionIndex: Math.max(0, suggestionIndex - 1) });
        return;
      }
      // Multi-line caret movement (ADR U6): move to the row above when the caret
      // isn't already on the first visual row. Only on the first row does ↑ fall
      // through to history recall — so it never clobbers a multi-line draft.
      const upLayout = layoutInput(value, cursor, wrapWidth(width));
      if (upLayout.caretRow > 0) {
        onChange({ ...state, cursor: rowColToCursor(upLayout, upLayout.caretRow - 1, upLayout.caretCol) });
        return;
      }
      if (history.length === 0) return;
      const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      const h = history[next] ?? '';
      onChange({ ...state, value: h, cursor: h.length, historyIndex: next });
      return;
    }

    if (key.downArrow && !key.shift) {
      logger.debug('input.downArrow', {
        inSlashMode,
        historyLength: history.length,
        historyIndex,
      });
      if (inSlashMode) {
        onChange({ ...state, suggestionIndex: Math.min(suggestions.length - 1, suggestionIndex + 1) });
        return;
      }
      // Multi-line caret movement: move to the row below when the caret isn't on
      // the last visual row. Only on the last row does ↓ fall through to history.
      const downLayout = layoutInput(value, cursor, wrapWidth(width));
      if (downLayout.caretRow < downLayout.rows.length - 1) {
        onChange({
          ...state,
          cursor: rowColToCursor(downLayout, downLayout.caretRow + 1, downLayout.caretCol),
        });
        return;
      }
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        onChange({ ...state, value: '', cursor: 0, historyIndex: null });
      } else {
        const h = history[next] ?? '';
        onChange({ ...state, value: h, cursor: h.length, historyIndex: next });
      }
      return;
    }

    // Word-wise motion (must precede the plain-arrow checks, since Alt/Ctrl+←
    // also set key.leftArrow). Supports Alt/Ctrl+←/→ and readline's Meta-b/f.
    if ((key.leftArrow && (key.meta || key.ctrl)) || (key.meta && input === 'b')) {
      onChange({ ...state, cursor: prevWordStart(value, cursor) });
      return;
    }
    if ((key.rightArrow && (key.meta || key.ctrl)) || (key.meta && input === 'f')) {
      onChange({ ...state, cursor: nextWordEnd(value, cursor) });
      return;
    }

    if (key.leftArrow) {
      onChange({ ...state, cursor: Math.max(0, cursor - 1) });
      return;
    }
    if (key.rightArrow) {
      onChange({ ...state, cursor: Math.min(value.length, cursor + 1) });
      return;
    }

    // Delete the previous word: Alt+Backspace or Ctrl+W (readline word-rubout).
    // Must precede the plain backspace check, since Alt+Backspace also sets
    // key.backspace. (Ctrl+Backspace is indistinguishable from plain backspace
    // in most terminals, so it is intentionally left as single-char delete.)
    if ((key.backspace && key.meta) || (key.ctrl && input === 'w')) {
      if (cursor === 0) return;
      const start = prevWordStart(value, cursor);
      onChange({
        ...state,
        value: value.slice(0, start) + value.slice(cursor),
        cursor: start,
        suggestionIndex: 0,
      });
      return;
    }

    if (key.backspace) {
      if (cursor === 0) return;
      onChange({
        ...state,
        value: value.slice(0, cursor - 1) + value.slice(cursor),
        cursor: cursor - 1,
        suggestionIndex: 0,
      });
      return;
    }

    // Forward delete: the Delete key (CSI 3~, reported by Ink as key.delete —
    // distinct from Backspace's 0x7f/0x08) removes the character to the right of
    // the caret, leaving the caret in place. A no-op at end of input.
    if (key.delete) {
      if (cursor >= value.length) return;
      onChange({
        ...state,
        value: value.slice(0, cursor) + value.slice(cursor + 1),
        suggestionIndex: 0,
      });
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      // Normalize CRLF/CR (from pastes) to LF so the value holds a single
      // newline convention; multi-line pastes thus land as real \n lines.
      const ins = input.replace(/\r\n?/g, '\n');
      onChange({
        ...state,
        value: value.slice(0, cursor) + ins + value.slice(cursor),
        cursor: cursor + ins.length,
        suggestionIndex: 0,
      });
    }
  });

  const clampedSuggestionIndex = Math.min(suggestionIndex, Math.max(0, suggestions.length - 1));
  const promptColor = disabled ? 'gray' : inShellMode ? 'red' : 'magenta';

  // Multi-line input (ADR U6): the value soft-wraps and honors embedded
  // newlines. The `›` prompt lives in its own fixed-width gutter column so it is
  // never swept into the wrapping flow (which would orphan it), and each visual
  // row is a single <Text> so the inverse block caret flows inline rather than
  // being stranded as a separate layout box. The box grows up to INPUT_MAX_ROWS
  // then scrolls internally around the caret, keeping the layout bounded.
  const { rows, caretRow, caretCol } = layoutInput(value, cursor, wrapWidth(width));
  const total = rows.length;
  const startRow =
    total > INPUT_MAX_ROWS
      ? Math.min(Math.max(0, caretRow - Math.floor(INPUT_MAX_ROWS / 2)), total - INPUT_MAX_ROWS)
      : 0;
  const visibleRows = rows.slice(startRow, startRow + INPUT_MAX_ROWS);

  return (
    <Box flexDirection="column">
      {inSlashMode && (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text dimColor>↑/↓ navigate · enter to run · shift+enter newline</Text>
          {suggestions.map((c, i) => {
            const selected = i === clampedSuggestionIndex;
            return (
              <Box key={c.name}>
                <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
                  {' '}
                  {c.label.padEnd(10)}{' '}
                </Text>
                <Text dimColor> {c.description}</Text>
              </Box>
            );
          })}
        </Box>
      )}
      <Box borderStyle="round" borderColor={promptColor} paddingX={1} flexDirection="row">
        {/* Prompt gutter: `›` on the first row, alignment spaces on continuations. */}
        <Box flexDirection="column" flexShrink={0}>
          {visibleRows.map((_, i) => (
            <Text key={i} color={promptColor} bold>
              {startRow + i === 0 ? '› ' : '  '}
            </Text>
          ))}
        </Box>
        {/* Value rows; the caret row splits around the inverse block cursor. */}
        <Box flexDirection="column">
          {visibleRows.map((row, i) => {
            const absRow = startRow + i;
            if (absRow !== caretRow) {
              return (
                <Text key={i} wrap="truncate-end">
                  {row.length > 0 ? row : ' '}
                </Text>
              );
            }
            return (
              <Text key={i} wrap="truncate-end">
                {row.slice(0, caretCol)}
                <Text inverse>{row[caretCol] ?? ' '}</Text>
                {row.slice(caretCol + 1)}
              </Text>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
