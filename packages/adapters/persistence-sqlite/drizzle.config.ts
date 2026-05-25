import { defineConfig } from 'drizzle-kit';

/**
 * Schema is the source of truth; migrations are generated into ./drizzle and
 * committed. Applied at runtime by the migrator in `src/db.ts` (not by the CLI),
 * so no live `dbCredentials` connection is configured here.
 *
 *   bun x drizzle-kit generate   # diff schema -> new ./drizzle/*.sql
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
});
