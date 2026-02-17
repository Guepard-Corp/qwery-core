import { parseFrontmatter, stringifyFrontmatter } from './frontmatter';
import type { QueryFn } from './types';

const VEGA_LITE_SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';

type VegaLiteSpec = Record<string, unknown>;

function vegaLite(spec: VegaLiteSpec): VegaLiteSpec {
  return { $schema: VEGA_LITE_SCHEMA, ...spec };
}

async function runCodeBlock(
  code: string,
  queryFn: QueryFn,
): Promise<VegaLiteSpec | null> {
  let capturedSpec: VegaLiteSpec | null = null;

  function display(spec: VegaLiteSpec): void {
    capturedSpec = spec;
  }

  const extension = {
    query: (sql: string, options?: { engine?: string }) =>
      queryFn(sql, options),
  };

  // Use AsyncFunction to support top-level await in code blocks
  const AsyncFunction = Object.getPrototypeOf(async function () {})
    .constructor as new (
    ...args: string[]
  ) => (...args: unknown[]) => Promise<void>;

  const fn = new AsyncFunction('extension', 'vegaLite', 'display', code);

  await fn(extension, vegaLite, display);

  return capturedSpec;
}

/**
 * Processes a dynamic report markdown string by executing all ```js code blocks.
 *
 * Each ```js block may call:
 * - extension.query(sql, options?) — runs a SQL query via the provided queryFn
 * - vegaLite(spec) — builds a vega-lite spec with $schema
 * - display(spec) — captures the spec for rendering
 *
 * The ```js block is replaced with a ```vega-lite block containing the
 * serialized spec with query results inlined.
 *
 * Non-js code blocks and prose pass through unchanged.
 */
export async function executeReport(
  markdown: string,
  queryFn: QueryFn,
): Promise<string> {
  const parsed = parseFrontmatter(markdown);
  const body = parsed.content;

  // Match ```js ... ``` blocks (non-greedy, handles multiline)
  const JS_BLOCK_RE = /^```js\n([\s\S]*?)^```/gm;

  const replacements: Array<{ match: string; replacement: string }> = [];

  let execMatch: RegExpExecArray | null;
  while ((execMatch = JS_BLOCK_RE.exec(body)) !== null) {
    const fullMatch = execMatch[0];
    const code = execMatch[1] ?? '';

    let spec: VegaLiteSpec | null = null;
    try {
      spec = await runCodeBlock(code, queryFn);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      replacements.push({
        match: fullMatch,
        replacement: `\`\`\`vega-lite-error\n${message}\n\`\`\``,
      });
      continue;
    }

    if (spec !== null) {
      replacements.push({
        match: fullMatch,
        replacement: `\`\`\`vega-lite\n${JSON.stringify(spec, null, 2)}\n\`\`\``,
      });
    } else {
      // display() was never called — remove the block entirely
      replacements.push({ match: fullMatch, replacement: '' });
    }
  }

  let processedBody = body;
  for (const { match, replacement } of replacements) {
    processedBody = processedBody.replace(match, replacement);
  }

  return stringifyFrontmatter(processedBody, parsed.data);
}
