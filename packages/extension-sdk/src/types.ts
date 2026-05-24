import { z } from 'zod';

// --- Datasource metadata + result types come from the domain so the SDK
//     re-exports them for extension authors without forcing a separate import.

/** Scopes of capability an extension may contribute to (qwery-core parity). */
export enum ExtensionScope {
  DATASOURCE = 'datasource',
  DRIVER = 'driver',
  HOOK = 'hook',
  TOOL = 'tool',
  AGENT = 'agent',
  SKILL = 'skill',
}

export const ExtensionDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scope: z.nativeEnum(ExtensionScope),
  schema: z.any().optional().nullable(),
  docsUrl: z.string().nullable().optional(),
});
export type ExtensionDefinition = z.infer<typeof ExtensionDefinitionSchema>;

export const DriverRuntimeSchema = z.enum(['node', 'browser']);
export type DriverRuntime = z.infer<typeof DriverRuntimeSchema>;

export const DriverExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  runtime: DriverRuntimeSchema.optional(),
  entry: z.string().optional(),
});
export type DriverExtension = z.infer<typeof DriverExtensionSchema>;

export const DatasourceExtensionSchema = ExtensionDefinitionSchema.extend({
  drivers: z.array(DriverExtensionSchema),
});
export type DatasourceExtension = z.infer<typeof DatasourceExtensionSchema>;

export interface Disposable {
  dispose(): void;
}

export interface ExtensionContext {
  subscriptions: Disposable[];
}

export interface SecureStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ExtensionLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface DriverContext {
  /** Datasource configuration provided at driver creation time. */
  config: unknown;
  logger?: ExtensionLogger;
  secrets?: SecureStore;
  abortSignal?: AbortSignal;
  runtime?: DriverRuntime;
  /**
   * Connection into the host's federated query engine (typically DuckDB).
   * Drivers use it to `CREATE VIEW` / `CREATE TABLE` / `ATTACH` so their data
   * becomes queryable through the agent's normal `runQuery` / `present` tools.
   */
  queryEngineConnection?: unknown;
}

/** Options passed to `driver.attach()`. */
export interface DriverAttachOptions {
  /** Optional schema/catalog name to namespace this datasource's views. */
  schemaName?: string;
  /** Optional default view/table name hint for single-view drivers. */
  viewName?: string;
  /** Optional session id for logging/cache keys. */
  sessionId?: string;
  /** Datasource id (UUID) — drivers that ATTACH a whole remote catalog use it
   *  to derive a per-datasource, collision-free DuckDB catalog name. */
  datasourceId?: string;
  /** Short shareable id of the datasource — friendlier than the UUID for
   *  catalog naming, and stable across attach/detach cycles. */
  datasourceSlug?: string;
  /** Optional workspace root for logging. */
  workspace?: string;
}

export interface DriverAttachTable {
  schema: string;
  table: string;
  /** Fully-qualified path used by federated SQL (e.g. `mysql_prod.users`). */
  path: string;
}

export interface DriverAttachResult {
  tables: DriverAttachTable[];
}

export interface DriverDetachOptions {
  schemaName?: string;
  tableNames?: string[];
  sessionId?: string;
  datasourceId?: string;
  datasourceSlug?: string;
  workspace?: string;
}

// Re-export domain metadata types so drivers can import everything from the SDK.
export type { Column, SimpleColumn, SimpleSchema, SimpleTable, Table } from '@qwery/domain';

import type { DatasourceMetadata, DatasourceResultSet } from '@qwery/domain';

export interface IDataSourceDriver {
  testConnection(): Promise<void>;
  query(sql: string): Promise<DatasourceResultSet>;
  metadata(): Promise<DatasourceMetadata>;
  close?(): Promise<void>;
  /**
   * Optional: register views/tables for this datasource in the federated query engine.
   * Implementations typically `CREATE VIEW` over a remote table or `ATTACH` a remote DB.
   */
  attach?(options: DriverAttachOptions): Promise<DriverAttachResult>;
  /** Optional: drop views/tables created by `attach()`. */
  detach?(options: DriverDetachOptions): Promise<void>;
}

export type DriverFactory = (context: DriverContext) => IDataSourceDriver;

export interface DatasourceDriverRegistration {
  id: string;
  factory: DriverFactory;
  runtime?: DriverRuntime;
}
