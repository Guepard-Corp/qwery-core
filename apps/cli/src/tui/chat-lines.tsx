import { TABLE_SENTINEL } from '@qwery/agent-factory-sdk';
import type { QueryResult } from '@qwery/domain';
import { Text } from 'ink';
import type { ReactNode } from 'react';
import type { ChatEntry } from '../chat-entry';
import { type Block, inlineWidth, parseBlocks, renderInline, stripInline } from './markdown';
import { fmtCell, planTable, truncateCell } from './table';
import { PRIVACY_SAFE, toolCallLine } from './tool-call';

/**
 * Flatten the chat into one React node per terminal line.
 *
 * Ink cannot reliably clip vertical overflow (it samples rows at a stride) and
 * corrupts its repaint when the frame is taller than the terminal. To stay safe
 * we render the chat as an exact list of single-row lines and let {@link
 * ChatView} window it by line — that gives precise height control *and*
 * line-granular scroll-back so a long report is fully reachable rather than
 * truncated.
 *
 * Every helper here emits exactly one terminal row per array element, so the
 * caller can slice the array and know the rendered height to the row.
 */

const BLANK: ReactNode = <Text> </Text>;

/**
 * Raw character count — the correct width for text that is rendered *verbatim*
 * (user echo, shell output), where markdown markers are printed, not parsed.
 */
const rawWidth = (raw: string): number => raw.length;

/**
 * Word-wrap a raw line to `width` visible columns, returning raw substrings
 * (markers preserved). A token wider than the line is hard-broken so the
 * rendered row never exceeds the width and Ink never re-wraps it into extra
 * (uncounted) rows.
 *
 * `measure` must report the width the row will actually paint at. It defaults to
 * {@link inlineWidth} for markdown content (rendered via {@link renderInline});
 * callers that render text verbatim pass {@link rawWidth}. Because both measures
 * satisfy `measure(s) <= s.length`, the additive packing only ever over-counts
 * when spans merge across a space (the safe direction) and the hard-break slices
 * always fit, so every emitted row is guaranteed to render within `width`.
 */
export function wrapRaw(raw: string, width: number, measure: (s: string) => number = inlineWidth): string[] {
  if (width <= 0) return [raw];
  const out: string[] = [];
  let cur = '';
  let curWidth = 0;
  const flush = () => {
    out.push(cur);
    cur = '';
    curWidth = 0;
  };
  for (const word of raw.split(' ')) {
    // Only hard-break on *visible* width, so a marker-heavy token (e.g.
    // `**bold**`, raw length 8 but 4 visible) isn't split mid-marker — which
    // would leave the markers unparsed and printed literally.
    if (measure(word) > width) {
      if (cur !== '') flush();
      let rest = word;
      while (measure(rest) > width) {
        out.push(rest.slice(0, width));
        rest = rest.slice(width);
      }
      cur = rest;
      curWidth = measure(rest);
      continue;
    }
    const w = measure(word);
    if (cur === '') {
      cur = word;
      curWidth = w;
    } else if (curWidth + 1 + w <= width) {
      cur += ` ${word}`;
      curWidth += 1 + w;
    } else {
      flush();
      cur = word;
      curWidth = w;
    }
  }
  out.push(cur);
  return out;
}

/** Hard-wrap (no word boundaries) — used for code, where spaces are content. */
function chunk(s: string, width: number): string[] {
  if (width <= 0 || s.length <= width) return [s];
  const out: string[] = [];
  for (let i = 0; i < s.length; i += width) out.push(s.slice(i, i + width));
  return out;
}

function blockToLines(block: Block, width: number): ReactNode[] {
  switch (block.kind) {
    case 'blank':
      return [BLANK];
    case 'hr':
      return [
        <Text key="hr" dimColor>
          {'─'.repeat(Math.min(40, width))}
        </Text>,
      ];
    case 'heading': {
      const color = block.level === 1 ? 'cyan' : block.level === 2 ? 'magenta' : 'yellow';
      const raw = `${'#'.repeat(block.level)} ${block.text}`;
      return wrapRaw(raw, width).map((ln, i) => (
        <Text key={i} bold color={color}>
          {renderInline(ln)}
        </Text>
      ));
    }
    case 'paragraph': {
      const lines: ReactNode[] = [];
      for (const src of block.lines) {
        for (const ln of wrapRaw(src, width)) lines.push(<Text>{renderInline(ln)}</Text>);
      }
      return lines;
    }
    case 'bullet':
    case 'ordered': {
      const lines: ReactNode[] = [];
      block.items.forEach((item, idx) => {
        const marker = block.kind === 'ordered' ? `${idx + 1}. ` : '• ';
        const indent = ' '.repeat(marker.length);
        wrapRaw(item, Math.max(1, width - marker.length)).forEach((ln, i) => {
          lines.push(
            <Text>
              <Text color="cyan">{i === 0 ? marker : indent}</Text>
              {renderInline(ln)}
            </Text>,
          );
        });
      });
      return lines;
    }
    case 'quote': {
      const lines: ReactNode[] = [];
      for (const src of block.lines) {
        wrapRaw(src, Math.max(1, width - 2)).forEach((ln) => {
          lines.push(
            <Text>
              <Text dimColor>│ </Text>
              <Text italic dimColor>
                {renderInline(ln)}
              </Text>
            </Text>,
          );
        });
      }
      return lines;
    }
    case 'code': {
      const lines: ReactNode[] = [];
      if (block.language) lines.push(<Text dimColor>{`│ ${block.language}`}</Text>);
      for (const src of block.content.split('\n')) {
        const wrapped = src.length > 0 ? chunk(src, Math.max(1, width - 2)) : [' '];
        wrapped.forEach((ln) => {
          lines.push(
            <Text>
              <Text dimColor>│ </Text>
              <Text color="green">{ln}</Text>
            </Text>,
          );
        });
      }
      return lines;
    }
    case 'table': {
      // Stacked definition-list form (the markdown renderer's own fallback) —
      // one field per line keeps the flatten exact and readable at any width.
      const lines: ReactNode[] = [];
      block.rows.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (c === 0) {
            for (const ln of wrapRaw(cell, width)) {
              lines.push(
                <Text bold color="cyan">
                  {renderInline(ln)}
                </Text>,
              );
            }
          } else {
            const label = stripInline(block.header[c] ?? '').trim();
            for (const ln of wrapRaw(`${label}: ${cell}`, width)) {
              lines.push(<Text>{renderInline(ln)}</Text>);
            }
          }
        });
        if (r < block.rows.length - 1) lines.push(BLANK);
      });
      return lines;
    }
  }
}

export function markdownToLines(text: string, width: number): ReactNode[] {
  return parseBlocks(text).flatMap((b) => blockToLines(b, width));
}

/**
 * Line-by-line equivalent of the {@link Table} component. Shares {@link
 * planTable} so the DuckDB-style row/column caps and footer (ADR U5) stay
 * identical to the Results pane; only the layout differs (padded text rows
 * instead of Ink `Box` columns) because the flattener needs one node per row.
 */
function tableToLines(result: QueryResult): ReactNode[] {
  if (result.rowCount === 0) {
    return [
      <Text key="empty" dimColor>
        (0 rows · {result.durationMs} ms)
      </Text>,
    ];
  }
  const { cols, widths, rowSlice, footer } = planTable(result);
  const cell = (text: string, i: number) => text.padEnd(widths[i]! + 2);

  const lines: ReactNode[] = [];
  lines.push(
    <Text bold color="cyan">
      {cols.map((c, i) => cell(truncateCell(c, widths[i]!), i)).join('')}
    </Text>,
  );
  lines.push(<Text dimColor>{cols.map((_, i) => '─'.repeat(widths[i]! + 2)).join('')}</Text>);
  for (const r of rowSlice) {
    if (r === '…') {
      lines.push(<Text dimColor>…</Text>);
    } else {
      lines.push(
        <Text>
          {cols.map((c, i) => cell(c === '…' ? '…' : truncateCell(fmtCell(r[c]), widths[i]!), i)).join('')}
        </Text>,
      );
    }
  }
  lines.push(<Text dimColor>{footer}</Text>);
  return lines;
}

function entryToLines(entry: ChatEntry, width: number): ReactNode[] {
  switch (entry.kind) {
    case 'user': {
      // The user's text is printed verbatim (no markdown), so measure raw chars.
      const wrapped = wrapRaw(entry.text, Math.max(1, width - 2), rawWidth);
      return wrapped.map((ln, i) => (
        <Text key={i}>
          {i === 0 ? (
            <Text color="magenta" bold>
              {'> '}
            </Text>
          ) : (
            <Text>{'  '}</Text>
          )}
          {ln}
        </Text>
      ));
    }
    case 'assistant':
      return markdownToLines(entry.text, width);
    case 'shell': {
      const lines: ReactNode[] = [];
      wrapRaw(entry.command, Math.max(1, width - 2), rawWidth).forEach((ln, i) => {
        lines.push(
          <Text>
            {i === 0 ? (
              <Text color="red" bold>
                {'! '}
              </Text>
            ) : (
              <Text>{'  '}</Text>
            )}
            <Text>{ln}</Text>
            {i === 0 && entry.exitCode !== 0 ? <Text color="red"> (exit {entry.exitCode})</Text> : null}
          </Text>,
        );
      });
      for (const out of entry.output.split('\n')) {
        for (const ln of chunk(out, width)) lines.push(<Text dimColor>{ln || ' '}</Text>);
      }
      return lines;
    }
    case 'rendered': {
      const parts = entry.text.split(TABLE_SENTINEL);
      const lines: ReactNode[] = [];
      parts.forEach((part, i) => {
        if (part.length > 0) lines.push(...markdownToLines(part, Math.max(1, width - 2)));
        if (i < parts.length - 1) lines.push(...tableToLines(entry.result));
      });
      return lines;
    }
    case 'tool':
      return [toolCallLine(entry.event, PRIVACY_SAFE.has(entry.event.name))];
  }
}

/**
 * Flatten all entries (and the live streaming buffer) into terminal-line nodes.
 * A blank spacer separates entries; the streaming tail is appended last with a
 * cursor line so it sits at the bottom.
 */
export function flattenChatLines(
  entries: ChatEntry[],
  streaming: string | undefined,
  width: number,
): ReactNode[] {
  const lines: ReactNode[] = [];
  entries.forEach((entry, i) => {
    if (i > 0) lines.push(BLANK);
    lines.push(...entryToLines(entry, width));
  });
  if (streaming && streaming.length > 0) {
    if (lines.length > 0) lines.push(BLANK);
    lines.push(...markdownToLines(streaming, width));
    lines.push(<Text color="gray">▎</Text>);
  }
  return lines;
}
