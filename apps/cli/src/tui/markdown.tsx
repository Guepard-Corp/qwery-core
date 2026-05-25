import { Box, Text, useStdout } from 'ink';
import { Fragment, type ReactNode } from 'react';

/**
 * Block-level markdown renderer for the subset LLMs typically emit in chat:
 * - Headings (`#`, `##`, `###`)
 * - Bullets (`- `, `* `, `1. `)
 * - Fenced code blocks (```lang\n…\n```)
 * - Pipe tables (with header + alignment row)
 * - Horizontal rules (`---`, `___`, `***`)
 * - Inline: `**bold**`, `*italic*`, `_italic_`, `` `code` ``
 *
 * Anything else falls through as a plain paragraph. Tabular data the agent
 * produces from queries is still rendered locally via the `present` tool's
 * Mustache `{{table}}` — this component handles only chat prose.
 */

type Block =
  | { kind: 'blank' }
  | { kind: 'hr' }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'code'; language: string; content: string }
  | { kind: 'table'; header: string[]; align: Array<'left' | 'right' | 'center'>; rows: string[][] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const language = fence[1]!.trim();
      const content: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.match(/^```\s*$/)) {
        content.push(lines[i]!);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', language, content: content.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() });
      i++;
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      blocks.push({ kind: 'blank' });
      i++;
      continue;
    }

    // Pipe table: needs a header row + a separator row of dashes
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1]!)
    ) {
      const headerCells = splitPipeRow(line);
      const aligns = splitPipeRow(lines[i + 1]!).map((cell) => {
        const trimmed = cell.trim();
        const left = trimmed.startsWith(':');
        const right = trimmed.endsWith(':');
        if (left && right) return 'center' as const;
        if (right) return 'right' as const;
        return 'left' as const;
      });
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim().length > 0) {
        rows.push(splitPipeRow(lines[i]!));
        i++;
      }
      blocks.push({ kind: 'table', header: headerCells, align: aligns, rows });
      continue;
    }

    // Bullet list (`- ` / `* ` / `+ `)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'bullet', items });
      continue;
    }

    // Blockquote (`> ...`)
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', lines: quoteLines });
      continue;
    }

    // Ordered list (`1. `)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ordered', items });
      continue;
    }

    // Paragraph — gather contiguous non-empty non-special lines.
    const paragraph: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i]!;
      if (/^\s*$/.test(next)) break;
      if (/^```/.test(next)) break;
      if (/^(#{1,6})\s+/.test(next)) break;
      if (/^\s*[-*+]\s+/.test(next)) break;
      if (/^\s*\d+\.\s+/.test(next)) break;
      if (/^\s*>\s?/.test(next)) break;
      if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(next)) break;
      paragraph.push(next);
      i++;
    }
    blocks.push({ kind: 'paragraph', lines: paragraph });
  }

  return blocks;
}

function splitPipeRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

// --------------------------------------------------------------------------
// Inline rendering
// --------------------------------------------------------------------------

interface InlineToken {
  kind: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'strike';
  value: string;
  href?: string;
}

function tokenizeInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let buffer = '';
  let i = 0;
  const flush = () => {
    if (buffer.length > 0) {
      tokens.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < line.length) {
    // Markdown link [text](url)
    if (line[i] === '[') {
      const textEnd = line.indexOf(']', i + 1);
      if (textEnd !== -1 && line[textEnd + 1] === '(') {
        const urlEnd = line.indexOf(')', textEnd + 2);
        if (urlEnd !== -1) {
          flush();
          tokens.push({
            kind: 'link',
            value: line.slice(i + 1, textEnd),
            href: line.slice(textEnd + 2, urlEnd),
          });
          i = urlEnd + 1;
          continue;
        }
      }
    }
    // Strikethrough ~~text~~
    if (line.startsWith('~~', i)) {
      const end = line.indexOf('~~', i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ kind: 'strike', value: line.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (line.startsWith('**', i)) {
      const end = line.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ kind: 'bold', value: line.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (line[i] === '`') {
      const end = line.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        tokens.push({ kind: 'code', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (line[i] === '*' && line[i + 1] !== '*') {
      const end = findClosingItalic(line, i + 1, '*');
      if (end !== -1) {
        flush();
        tokens.push({ kind: 'italic', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (line[i] === '_') {
      const end = findClosingItalic(line, i + 1, '_');
      if (end !== -1) {
        flush();
        tokens.push({ kind: 'italic', value: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buffer += line[i];
    i++;
  }
  flush();
  return tokens;
}

function findClosingItalic(line: string, from: number, char: '*' | '_'): number {
  for (let j = from; j < line.length; j++) {
    if (line[j] === char && line[j + 1] !== char) return j;
  }
  return -1;
}

function renderInline(line: string): ReactNode[] {
  return tokenizeInline(line).map((t, i) => {
    if (t.kind === 'bold')
      return (
        <Text key={i} bold>
          {t.value}
        </Text>
      );
    if (t.kind === 'italic')
      return (
        <Text key={i} italic>
          {t.value}
        </Text>
      );
    if (t.kind === 'strike')
      return (
        <Text key={i} strikethrough dimColor>
          {t.value}
        </Text>
      );
    if (t.kind === 'code')
      return (
        <Text key={i} color="green" inverse>
          {t.value}
        </Text>
      );
    if (t.kind === 'link')
      return (
        <Text key={i}>
          <Text underline color="cyan">
            {t.value}
          </Text>
          {t.href ? <Text dimColor> ({t.href})</Text> : null}
        </Text>
      );
    return <Text key={i}>{t.value}</Text>;
  });
}

/** Strip inline markdown for width calculations (renders w/ alignment in tables). */
function stripInline(line: string): string {
  return line
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1');
}

// --------------------------------------------------------------------------
// Block renderers
// --------------------------------------------------------------------------

function HeadingBlock({ level, text }: { level: number; text: string }) {
  const color = level === 1 ? 'cyan' : level === 2 ? 'magenta' : 'yellow';
  return (
    <Box marginTop={level === 1 ? 0 : 0}>
      <Text bold color={color}>
        {level === 1 ? '# ' : level === 2 ? '## ' : `${'#'.repeat(level)} `}
      </Text>
      <Text bold color={color}>
        {renderInline(text)}
      </Text>
    </Box>
  );
}

function ParagraphBlock({ lines }: { lines: string[] }) {
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i}>{renderInline(line)}</Text>
      ))}
    </Box>
  );
}

function BulletBlock({ items, ordered }: { items: string[]; ordered: boolean }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Box key={i}>
          <Text color="cyan">{ordered ? `${i + 1}. ` : '• '}</Text>
          <Text>{renderInline(item)}</Text>
        </Box>
      ))}
    </Box>
  );
}

function QuoteBlock({ lines }: { lines: string[] }) {
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Box key={i}>
          <Text dimColor>│ </Text>
          <Text italic dimColor>
            {renderInline(line)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function CodeBlock({ language, content }: { language: string; content: string }) {
  return (
    <Box
      flexDirection="column"
      paddingLeft={1}
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor="gray"
    >
      {language && <Text dimColor>{language}</Text>}
      {content.split('\n').map((line, i) => (
        <Text key={i} color="green">
          {line || ' '}
        </Text>
      ))}
    </Box>
  );
}

function HrBlock() {
  return (
    <Box>
      <Text dimColor>{'─'.repeat(40)}</Text>
    </Box>
  );
}

function TableBlock({
  header,
  align,
  rows,
  availableWidth,
}: {
  header: string[];
  align: Array<'left' | 'right' | 'center'>;
  rows: string[][];
  availableWidth: number;
}) {
  const colCount = header.length;
  // Compute natural column widths from visible (stripped) content.
  const naturalWidths = new Array<number>(colCount).fill(0);
  const measure = (cells: string[]) => {
    for (let c = 0; c < colCount; c++) {
      const cell = cells[c] ?? '';
      const w = stripInline(cell).length;
      if (w > naturalWidths[c]!) naturalWidths[c] = w;
    }
  };
  measure(header);
  for (const row of rows) measure(row);

  // A bordered table consumes: `│ ` (2) per cell + `│` (1) at end + cell widths + cell trailing space (1) per cell.
  // Total = 1 + sum(w + 3) = 1 + 3*colCount + sum(widths).
  const naturalTotal = 1 + 3 * colCount + naturalWidths.reduce((a, b) => a + b, 0);

  // Fallback: render as a stacked definition list when the bordered table
  // would not fit the available width. Keeps wrapping clean and readable.
  if (naturalTotal > availableWidth) {
    return (
      <Box flexDirection="column">
        {rows.map((row, r) => (
          <Box key={r} flexDirection="column" marginBottom={r === rows.length - 1 ? 0 : 1}>
            {row.map((cell, c) => {
              const label = stripInline(header[c] ?? '').trim();
              return (
                <Box key={c} flexDirection="column">
                  {c === 0 ? (
                    <Text bold color="cyan">
                      {renderInline(cell)}
                    </Text>
                  ) : (
                    <Box>
                      <Text dimColor>{label}: </Text>
                      <Text>{renderInline(cell)}</Text>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  }

  // Bordered table — content fits the available width.
  const pad = (raw: string, width: number, alignment: 'left' | 'right' | 'center'): string => {
    const visible = stripInline(raw);
    const slack = Math.max(0, width - visible.length);
    if (alignment === 'right') return ' '.repeat(slack) + raw;
    if (alignment === 'center') {
      const left = Math.floor(slack / 2);
      return ' '.repeat(left) + raw + ' '.repeat(slack - left);
    }
    return raw + ' '.repeat(slack);
  };

  const renderRow = (cells: string[], bold: boolean): ReactNode => (
    <Box>
      {cells.map((cell, c) => {
        const padded = pad(cell, naturalWidths[c] ?? 0, align[c] ?? 'left');
        return (
          <Fragment key={c}>
            <Text dimColor>│ </Text>
            <Text bold={bold}>{renderInline(padded)}</Text>
            <Text> </Text>
          </Fragment>
        );
      })}
      <Text dimColor>│</Text>
    </Box>
  );

  const horizontalLine = (left: string, mid: string, right: string) => (
    <Box>
      <Text dimColor>
        {left}
        {naturalWidths.map((w) => '─'.repeat(w + 2)).join(mid)}
        {right}
      </Text>
    </Box>
  );

  return (
    <Box flexDirection="column">
      {horizontalLine('┌', '┬', '┐')}
      {renderRow(header, true)}
      {horizontalLine('├', '┼', '┤')}
      {rows.map((row, r) => (
        <Fragment key={r}>{renderRow(row, false)}</Fragment>
      ))}
      {horizontalLine('└', '┴', '┘')}
    </Box>
  );
}

// --------------------------------------------------------------------------
// Public entry
// --------------------------------------------------------------------------

export interface MarkdownProps {
  text: string;
  /**
   * Width budget the renderer can use (default = stdout.columns). Tables that
   * don't fit fall back to a stacked definition-list layout.
   */
  availableWidth?: number;
}

export function Markdown({ text, availableWidth }: MarkdownProps) {
  const { stdout } = useStdout();
  const width = availableWidth ?? stdout?.columns ?? 80;
  const blocks = parseBlocks(text);
  return (
    <Box flexDirection="column">
      {blocks.map((block, i) => {
        if (block.kind === 'blank') return <Text key={i}> </Text>;
        if (block.kind === 'hr') return <HrBlock key={i} />;
        if (block.kind === 'heading') return <HeadingBlock key={i} level={block.level} text={block.text} />;
        if (block.kind === 'paragraph') return <ParagraphBlock key={i} lines={block.lines} />;
        if (block.kind === 'bullet') return <BulletBlock key={i} items={block.items} ordered={false} />;
        if (block.kind === 'ordered') return <BulletBlock key={i} items={block.items} ordered={true} />;
        if (block.kind === 'quote') return <QuoteBlock key={i} lines={block.lines} />;
        if (block.kind === 'code')
          return <CodeBlock key={i} language={block.language} content={block.content} />;
        if (block.kind === 'table')
          return (
            <TableBlock
              key={i}
              header={block.header}
              align={block.align}
              rows={block.rows}
              availableWidth={width}
            />
          );
        return null;
      })}
    </Box>
  );
}
