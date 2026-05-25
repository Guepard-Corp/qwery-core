import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { migrations } from './migrations';

// Reduce a migration script to its ordered SQL statements, dropping the leading
// `--` comment lines (the generated files carry an explanatory header the inline
// copy omits) and normalizing whitespace, so equality reflects the DDL only.
function statements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

describe('embedded migrations', () => {
  // Guards against the inlined SQL drifting from the canonical drizzle-kit
  // output. If this fails, re-copy the generated `drizzle/<tag>.sql` into
  // `migrations.ts` (the inline copy exists so it survives `bun build --compile`).
  test.each(migrations.map((m) => m.tag))('%s matches its drizzle/*.sql file', async (tag) => {
    const generated = await Bun.file(join(import.meta.dir, '..', 'drizzle', `${tag}.sql`)).text();
    const inlined = migrations.find((m) => m.tag === tag)?.sql ?? '';
    expect(statements(inlined)).toEqual(statements(generated));
  });
});
