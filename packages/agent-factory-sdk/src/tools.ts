import {
  type Compute,
  type OntologyProvider,
  type SchemaRetriever,
  type ToolEvent,
  validateAggregateOnly,
} from '@qwery/domain';
import { tool } from 'ai';
import { z } from 'zod';
import { editFile } from './edit-tool';
import { renderTemplate, validateTemplateColumns } from './mustache-helpers';
import { readFileSafe, runBash, writeFileSafe } from './system-tools';
import { createExpandSchemaTool } from './tools/expand-schema';
import { createSchemaTool, type DatasourceSchemaProvider } from './tools/schema';
import { createSearchSchemaTool } from './tools/search-schema';
import { createTracker } from './tools/track';
import { createValidateQueryTool } from './tools/validate-query';

export interface BuildToolsOptions {
  compute: Compute;
  onEvent: (event: ToolEvent) => void;
  /** Native schema introspection over attached datasources (for the `schema` tool). */
  schemaProvider?: DatasourceSchemaProvider;
  /** Optional semantic-layer ontology port; enables the `validateQuery` tool when present. */
  ontologyProvider?: OntologyProvider;
  /** Optional semantic-layer retriever; enables the `searchSchema` tool when present. */
  schemaRetriever?: SchemaRetriever;
}

export function buildTools({
  compute,
  onEvent,
  schemaProvider,
  ontologyProvider,
  schemaRetriever,
}: BuildToolsOptions) {
  const track = createTracker(onEvent);

  return {
    schema: createSchemaTool({ track, schemaProvider }),

    searchSchema: createSearchSchemaTool({ track, schemaProvider, schemaRetriever, ontologyProvider }),

    expandSchema: createExpandSchemaTool({ track, schemaProvider }),

    validateQuery: createValidateQueryTool({ track, schemaProvider, ontologyProvider }),

    runQuery: tool({
      description:
        'Run an AGGREGATE-ONLY query and return the scalar result to the assistant. Every projected column MUST be an aggregate function (COUNT, SUM, AVG, MIN, MAX, MEDIAN, STDDEV, ...). NO column references, NO SELECT *, NO GROUP BY, NO ORDER BY, NO LIMIT. The output must be a single row. Use this when you need a number to answer the user. For tabular output, use present.',
      inputSchema: z.object({ sql: z.string().describe('Aggregate-only SQL.') }),
      execute: async ({ sql }) =>
        track('runQuery', { sql }, async () => {
          const check = validateAggregateOnly(sql);
          if (!check.ok) throw new Error(check.reason);
          const result = await compute.runSql(sql);
          if (result.rowCount !== 1) {
            throw new Error(
              `runQuery expects exactly 1 row of output, got ${result.rowCount}. Use present(sql, template) for multi-row results.`,
            );
          }
          const row = result.rows[0] ?? {};
          return {
            ui: { kind: 'runQuery', sql, row, result },
            llm: { ok: true as const, row },
          };
        }),
    }),

    describeQuery: tool({
      description:
        'Preview the OUTPUT schema (columns + types) of a query WITHOUT executing it. Use this when you plan to call present and need to know the column names to write a Mustache template. Privacy-safe: no row data is exposed.',
      inputSchema: z.object({ sql: z.string() }),
      execute: async ({ sql }) =>
        track('describeQuery', { sql }, async () => {
          const schema = await compute.describeSql(sql);
          return {
            ui: { kind: 'describeQuery', sql, schema },
            llm: { ok: true as const, columns: schema.columns },
          };
        }),
    }),

    present: tool({
      description:
        'Execute a SQL query AND render its result to the user via a Mustache template. You never see the rows; the user sees the rendered output. The template has access to: `rows` (array), `first` (rows[0]), `rowCount`, `table` (aligned table), and helpers `money`, `int`, `pct`, `date`. Example template: "Top countries:\\n{{table}}". Use this for any non-aggregate / multi-row output.',
      inputSchema: z.object({
        sql: z.string(),
        template: z.string().describe('A Mustache template using columns from the query result.'),
      }),
      execute: async ({ sql, template }) =>
        track('present', { sql, template }, async () => {
          const result = await compute.runSql(sql);
          const columnNames = result.columns;
          const unknown = validateTemplateColumns(template, columnNames);
          if (unknown.length > 0) {
            throw new Error(
              `Template references unknown columns: ${unknown.join(', ')}. Available columns: ${columnNames.join(', ')}.`,
            );
          }
          const rendered = renderTemplate(template, result.rows);
          return {
            ui: { kind: 'present', sql, template, rendered, result },
            llm: { ok: true as const, rowCount: result.rowCount },
          };
        }),
    }),

    bash: tool({
      description:
        'Run a shell command via bash. Runs with cwd pinned to the workspace, killed after 30s, output capped at 64KB. Use for scripts, file listings, git status, build commands. NEVER use it to read row data from data files (csv/parquet/json/sqlite) — use schema/runQuery/present instead so the privacy boundary holds.',
      inputSchema: z.object({
        command: z.string().describe('The bash command to run (single string, runs via `bash -c`).'),
      }),
      execute: async ({ command }) =>
        track('bash', { command }, async () => {
          const result = await runBash(command);
          return {
            ui: {
              kind: 'bash',
              command,
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
            },
            llm: {
              ok: result.exitCode === 0,
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
              truncated: result.truncated,
            },
          };
        }),
    }),

    read: tool({
      description:
        'Read a file from the workspace or ~/.qwery/cache. Returns up to 64KB of UTF-8 content. Use for scripts, configs, READMEs, schemas. NEVER use it to peek at data files (csv/parquet/json/sqlite rows) — use schema/runQuery/present instead.',
      inputSchema: z.object({
        path: z.string().describe('Workspace-relative or absolute path inside the workspace / cache root.'),
      }),
      execute: async ({ path: target }) =>
        track('read', { path: target }, async () => {
          const result = await readFileSafe(target);
          return {
            ui: {
              kind: 'read',
              path: result.path,
              bytes: result.bytes,
              truncated: result.truncated,
              preview: result.content,
            },
            llm: {
              ok: true as const,
              path: result.path,
              content: result.content,
              bytes: result.bytes,
              truncated: result.truncated,
            },
          };
        }),
    }),

    write: tool({
      description:
        'Write a file inside the workspace or ~/.qwery/cache. Content is UTF-8, max 1MB. Parent directories are created as needed. Use to save scripts, configs, generated artifacts. Refuses any path outside the allowed roots. PREFER `edit` over `write` when modifying an existing file — `write` replaces the entire file.',
      inputSchema: z.object({
        path: z.string().describe('Workspace-relative or absolute path inside the workspace / cache root.'),
        content: z.string().describe('UTF-8 file content.'),
      }),
      execute: async ({ path: target, content }) =>
        track('write', { path: target, content }, async () => {
          const result = await writeFileSafe(target, content);
          return {
            ui: { kind: 'write', path: result.path, bytes: result.bytes },
            llm: { ok: true as const, path: result.path, bytes: result.bytes },
          };
        }),
    }),

    edit: tool({
      description:
        'Apply one or more targeted replacements to an existing file in the workspace. Each edit specifies an exact `oldText` to find (must be unique in the file) and the `newText` to replace it with. All edits are validated against the original file first — if any oldText is missing or non-unique, NONE are applied (atomic). Use `edit` instead of `write` whenever you only want to change a portion of an existing file; you keep the rest of the file untouched and avoid wasting tokens rewriting it.',
      inputSchema: z.object({
        path: z.string().describe('Workspace-relative or absolute path to an existing file.'),
        edits: z
          .array(
            z.object({
              oldText: z
                .string()
                .min(1)
                .describe(
                  'Exact text to find — must be unique in the file. Include enough surrounding context to be unambiguous.',
                ),
              newText: z.string().describe('Replacement text for this edit.'),
            }),
          )
          .min(1)
          .describe(
            'One or more targeted replacements. Each match is computed against the original file (not incrementally), so do NOT chain edits where one depends on another applied first — merge them into a single edit instead.',
          ),
      }),
      execute: async ({ path: target, edits }) =>
        track('edit', { path: target, edits }, async () => {
          const result = await editFile(target, edits);
          return {
            ui: {
              kind: 'edit',
              path: result.path,
              appliedEdits: result.appliedEdits,
              bytesBefore: result.bytesBefore,
              bytesAfter: result.bytesAfter,
              diff: result.diff,
            },
            llm: {
              ok: true as const,
              path: result.path,
              appliedEdits: result.appliedEdits,
              bytesBefore: result.bytesBefore,
              bytesAfter: result.bytesAfter,
            },
          };
        }),
    }),
  };
}
