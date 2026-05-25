import init0000 from '../drizzle/0000_init.sql' with { type: 'text' };

/**
 * Migrations are embedded as text imports (not read from disk) so they survive
 * `bun build --compile`, which bundles imported assets into the single-file
 * binary but does not ship the `drizzle/` folder. drizzle-kit remains the
 * generator and snapshot/diff authority; the runtime applier lives in `db.ts`.
 *
 * Append one entry per generated migration, in journal order. Tags match the
 * file names under `drizzle/` (without the `.sql` extension).
 */
export interface EmbeddedMigration {
  tag: string;
  sql: string;
}

export const migrations: readonly EmbeddedMigration[] = [{ tag: '0000_init', sql: init0000 }];
