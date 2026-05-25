import type {
  IDatasourceRepository,
  IMessageRepository,
  ISecretVault,
  ISessionRepository,
  IUsageRepository,
} from '@qwery/domain';
import { SqliteDatasourceRepository } from './datasource.repository';
import { type DrizzleDb, openDatabase } from './db';
import { SqliteMessageRepository } from './message.repository';
import { SqliteSessionRepository } from './session.repository';
import { SqliteUsageRepository } from './usage.repository';

export { SqliteDatasourceRepository } from './datasource.repository';
export { type DrizzleDb, defaultDbPath, openDatabase } from './db';
export { SqliteMessageRepository } from './message.repository';
export { SqliteSessionRepository } from './session.repository';
export { SqliteUsageRepository } from './usage.repository';

export interface SqlitePersistence {
  db: DrizzleDb;
  vault: ISecretVault;
  sessionRepo: ISessionRepository;
  messageRepo: IMessageRepository;
  usageRepo: IUsageRepository;
  datasourceRepo: IDatasourceRepository;
}

export interface CreateSqlitePersistenceOptions {
  /** Concrete secret vault, injected by the composition root (ADR #35). */
  vault: ISecretVault;
  /** Database file path. Defaults to `~/.qwery/qwery.sqlite` (or `QWERY_DB_PATH`). */
  dbPath?: string;
}

/**
 * Wires the SQLite-backed repositories behind the domain ports. The vault is
 * injected (not constructed here) so this adapter depends on no other adapter.
 */
export function createSqlitePersistence(opts: CreateSqlitePersistenceOptions): SqlitePersistence {
  const db = openDatabase(opts.dbPath);
  return {
    db,
    vault: opts.vault,
    sessionRepo: new SqliteSessionRepository(db),
    messageRepo: new SqliteMessageRepository(db),
    usageRepo: new SqliteUsageRepository(db),
    datasourceRepo: new SqliteDatasourceRepository(db, opts.vault),
  };
}
