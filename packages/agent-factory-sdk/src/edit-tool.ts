import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveSafePath } from './system-tools';

export interface EditOp {
  oldText: string;
  newText: string;
}

export interface EditResult {
  path: string;
  appliedEdits: number;
  diff: string;
  bytesBefore: number;
  bytesAfter: number;
}

/** NFKC + smart quotes/dashes/spaces normalization for fuzzy matching. */
function normalizeForFuzzy(text: string): string {
  return text
    .normalize('NFKC')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/[  -   　]/g, ' ');
}

function detectLineEnding(content: string): '\n' | '\r\n' {
  const crlf = content.indexOf('\r\n');
  const lf = content.indexOf('\n');
  if (lf === -1) return '\n';
  if (crlf === -1) return '\n';
  return crlf < lf ? '\r\n' : '\n';
}

function normalizeToLF(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function restoreLineEndings(text: string, ending: '\n' | '\r\n'): string {
  return ending === '\r\n' ? text.replace(/\n/g, '\r\n') : text;
}

interface MatchSpan {
  start: number;
  end: number;
  variant: 'exact' | 'fuzzy';
}

/** Locate `needle` inside `haystack`. Exact first, fuzzy fallback. */
function findUniqueMatch(haystack: string, needle: string): MatchSpan | { error: string } {
  if (needle.length === 0) return { error: 'oldText is empty' };
  const exactIndex = haystack.indexOf(needle);
  if (exactIndex !== -1) {
    const second = haystack.indexOf(needle, exactIndex + 1);
    if (second !== -1) {
      return {
        error: `oldText is not unique in the file (found at offsets ${exactIndex} and ${second}; add more surrounding context)`,
      };
    }
    return { start: exactIndex, end: exactIndex + needle.length, variant: 'exact' };
  }
  const normalizedHay = normalizeForFuzzy(haystack);
  const normalizedNeedle = normalizeForFuzzy(needle);
  const fuzzyIndex = normalizedHay.indexOf(normalizedNeedle);
  if (fuzzyIndex === -1)
    return {
      error:
        'oldText not found in the file (tried exact and fuzzy match on smart quotes / dashes / whitespace)',
    };
  const second = normalizedHay.indexOf(normalizedNeedle, fuzzyIndex + 1);
  if (second !== -1) {
    return { error: `fuzzy match of oldText is not unique (found at offsets ${fuzzyIndex} and ${second})` };
  }
  return { start: fuzzyIndex, end: fuzzyIndex + normalizedNeedle.length, variant: 'fuzzy' };
}

/** Tiny unified-diff renderer for the UI; not a parser. */
function buildDiff(filePath: string, before: string, after: string): string {
  if (before === after) return '';
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);
  const lines: string[] = [`--- ${filePath}`, `+++ ${filePath}`];
  for (let i = 0; i < max; i++) {
    const a = beforeLines[i];
    const b = afterLines[i];
    if (a === b) continue;
    if (a !== undefined) lines.push(`- ${a}`);
    if (b !== undefined) lines.push(`+ ${b}`);
  }
  return lines.join('\n');
}

const fileLocks = new Map<string, Promise<unknown>>();

/**
 * Serialize edits on the same absolute path so two concurrent calls cannot
 * race on the same file. Inspired by pi's `withFileMutationQueue`.
 */
async function withFileLock<T>(absolutePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(absolutePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  // Store a settled-without-rejection version so the next caller can chain off
  // it, and so a rejection from `fn` doesn't surface as an unhandledRejection
  // through this side branch (the original `next` is still awaited by the
  // caller, which is the only legitimate place the error should be observed).
  const cleanup = next.then(
    () => {
      if (fileLocks.get(absolutePath) === cleanup) fileLocks.delete(absolutePath);
    },
    () => {
      if (fileLocks.get(absolutePath) === cleanup) fileLocks.delete(absolutePath);
    },
  );
  fileLocks.set(absolutePath, cleanup);
  return next;
}

export async function editFile(input: string, edits: EditOp[]): Promise<EditResult> {
  if (!Array.isArray(edits) || edits.length === 0) {
    throw new Error('edit: at least one { oldText, newText } edit is required');
  }
  const absolute = resolveSafePath(input);

  return withFileLock(absolute, async () => {
    let raw: string;
    try {
      raw = await fs.readFile(absolute, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`edit: file "${input}" does not exist (use write to create new files)`);
      }
      throw err;
    }
    const ending = detectLineEnding(raw);
    const lf = normalizeToLF(raw);

    // First pass: resolve every edit's match against the *current* file content.
    // We deliberately re-locate after each applied edit so the LLM doesn't have
    // to compute offsets — but we also assert that edits do not target the same
    // region by checking non-overlap on the first pass spans.
    const spans: Array<{ span: MatchSpan; edit: EditOp }> = [];
    let probe = lf;
    let consumedPrefix = 0;
    for (const edit of edits) {
      const match = findUniqueMatch(probe, edit.oldText);
      if ('error' in match) {
        throw new Error(`edit #${spans.length + 1}: ${match.error}`);
      }
      spans.push({
        span: {
          start: match.start + consumedPrefix,
          end: match.end + consumedPrefix,
          variant: match.variant,
        },
        edit,
      });
      // For overlap detection we keep walking forward on the same buffer; we
      // don't actually mutate probe between iterations because the diff is
      // computed at the end. The non-overlap check below catches the case
      // where two edits target the same region.
      const ovelapsAny = spans.slice(0, -1).some(({ span }) => {
        const a = spans[spans.length - 1]!.span;
        return !(a.end <= span.start || span.end <= a.start);
      });
      if (ovelapsAny) {
        throw new Error(`edit #${spans.length}: target range overlaps with a previous edit in the same call`);
      }
      probe = lf; // re-search from the whole content for the next edit
      consumedPrefix = 0;
    }

    // Apply edits in reverse offset order so earlier spans keep their offsets.
    const ordered = [...spans].sort((a, b) => b.span.start - a.span.start);
    let modified = lf;
    for (const { span, edit } of ordered) {
      modified = modified.slice(0, span.start) + edit.newText + modified.slice(span.end);
    }

    const after = restoreLineEndings(modified, ending);
    if (after === raw) {
      // No-op edits — still a valid call but report it.
      return {
        path: path.relative(process.cwd(), absolute) || absolute,
        appliedEdits: 0,
        diff: '',
        bytesBefore: Buffer.byteLength(raw, 'utf-8'),
        bytesAfter: Buffer.byteLength(after, 'utf-8'),
      };
    }
    await fs.writeFile(absolute, after, 'utf-8');
    return {
      path: path.relative(process.cwd(), absolute) || absolute,
      appliedEdits: edits.length,
      diff: buildDiff(path.relative(process.cwd(), absolute) || absolute, raw, after),
      bytesBefore: Buffer.byteLength(raw, 'utf-8'),
      bytesAfter: Buffer.byteLength(after, 'utf-8'),
    };
  });
}
