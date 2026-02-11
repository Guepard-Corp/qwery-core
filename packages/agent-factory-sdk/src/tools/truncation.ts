import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

export const Truncate = {
  MAX_LINES: 2000,
  MAX_BYTES: 50 * 1024,
  /** Directory for truncated tool outputs. Defaults to os.tmpdir()/qwery-tool-output. */
  getDir: (): string => path.join(tmpdir(), 'qwery-tool-output'),
} as const;

export type TruncateResult =
  | { content: string; truncated: false }
  | { content: string; truncated: true; outputPath: string };

export type TruncateOptions = {
  maxLines?: number;
  maxBytes?: number;
  direction?: 'head' | 'tail';
  outputDir?: string;
};

function createId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Truncate tool output to max lines/bytes; write full content to a file and return preview + path.
 * Use in the tool execute wrapper to avoid huge tool responses.
 */
export async function truncateOutput(
  text: string,
  options: TruncateOptions = {},
): Promise<TruncateResult> {
  const maxLines = options.maxLines ?? Truncate.MAX_LINES;
  const maxBytes = options.maxBytes ?? Truncate.MAX_BYTES;
  const direction = options.direction ?? 'head';
  const outputDir = options.outputDir ?? Truncate.getDir();

  const lines = text.split('\n');
  const totalBytes = Buffer.byteLength(text, 'utf-8');

  if (lines.length <= maxLines && totalBytes <= maxBytes) {
    return { content: text, truncated: false };
  }

  const out: string[] = [];
  let i = 0;
  let bytes = 0;
  let hitBytes = false;

  if (direction === 'head') {
    for (i = 0; i < lines.length && i < maxLines; i++) {
      const size = Buffer.byteLength(lines[i]!, 'utf-8') + (i > 0 ? 1 : 0);
      if (bytes + size > maxBytes) {
        hitBytes = true;
        break;
      }
      out.push(lines[i]!);
      bytes += size;
    }
  } else {
    for (i = lines.length - 1; i >= 0 && out.length < maxLines; i--) {
      const size =
        Buffer.byteLength(lines[i]!, 'utf-8') + (out.length > 0 ? 1 : 0);
      if (bytes + size > maxBytes) {
        hitBytes = true;
        break;
      }
      out.unshift(lines[i]!);
      bytes += size;
    }
  }

  const removed = hitBytes ? totalBytes - bytes : lines.length - out.length;
  const unit = hitBytes ? 'bytes' : 'lines';
  const preview = out.join('\n');

  await mkdir(outputDir, { recursive: true });
  const id = createId();
  const filepath = path.join(outputDir, id);
  await writeFile(filepath, text, 'utf-8');

  const hint = `Full output saved to: ${filepath}`;
  const message =
    direction === 'head'
      ? `${preview}\n\n...${removed} ${unit} truncated...\n\n${hint}`
      : `...${removed} ${unit} truncated...\n\n${hint}\n\n${preview}`;

  return { content: message, truncated: true, outputPath: filepath };
}
