import { z } from 'zod';

import type { DatasourceMetadata, DatasourceResultSet } from './metadata';

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
  supportsPreview: z.boolean().optional(),
});

/**
 * Extension metadata (for listing without loading full extension)
 */
export type ExtensionDefinition = z.infer<typeof ExtensionDefinitionSchema>;

export const DriverRuntimeSchema = z.enum(['node', 'browser']);

export type DriverRuntime = z.infer<typeof DriverRuntimeSchema>;

/**
 * Extension driver metadata
 */
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

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface DriverContext {
  /** Datasource configuration provided at driver creation time */
  config: unknown;
  logger?: Logger;
  secrets?: SecureStore;
  abortSignal?: AbortSignal;
  runtime?: DriverRuntime;
  /**
   * Optional query engine connection for drivers that need to create views
   * in the main query engine (e.g. in-memory DuckDB). For attach/detach,
   * this is the federated connection; driver uses it only for CREATE VIEW /
   * CREATE TABLE / DROP (no ATTACH). This is abstract and engine-agnostic.
   */
  queryEngineConnection?: unknown;
}

/**
 * Options passed to driver.attach(); connection is DriverContext.queryEngineConnection (in-memory DuckDB).
 */
export interface DriverAttachOptions {
  /**
   * Optional schema name to namespace this datasource's views/tables.
   * Driver can CREATE SCHEMA if needed, then create views/tables in it.
   * If omitted, driver uses main (or a default schema).
   */
  schemaName?: string;
  /**
   * Optional hint for single-view drivers (default view/table name).
   * Multi-table drivers (e.g. GSheet tabs) can ignore and use their own naming.
   */
  viewName?: string;
  /** Optional: conversation ID (e.g. for logging or cache keys) */
  conversationId?: string;
  /** Optional: workspace root (e.g. for logging) */
  workspace?: string;
}

/**
 * One view or table created by the driver in the main DuckDB.
 */
export interface DriverAttachTable {
  /** Schema (e.g. "main" or custom schemaName) */
  schema: string;
  /** Table or view name */
  table: string;
  /** Query path for federated SQL, e.g. "main.my_view" or "ds_gsheet_1.tab_orders" */
  path: string;
}

/** Result of driver.attach() */
export interface DriverAttachResult {
  tables: DriverAttachTable[];
}

/**
 * Options passed to driver.detach().
 */
export interface DriverDetachOptions {
  /** Schema name used at attach (so driver knows what to drop) */
  schemaName?: string;
  /** Names of views/tables to drop (or driver can derive from config) */
  tableNames?: string[];
  conversationId?: string;
  workspace?: string;
}

export interface IDataSourceDriver {
  testConnection(): Promise<void>;
  query(sql: string): Promise<DatasourceResultSet>;
  metadata(): Promise<DatasourceMetadata>;
  close?(): Promise<void>;
  /**
   * Optional: create views/tables for this datasource in the federated query engine.
   * Uses DriverContext.queryEngineConnection (in-memory DuckDB). No ATTACH; only CREATE VIEW / CREATE TABLE.
   */
  attach?(options: DriverAttachOptions): Promise<DriverAttachResult>;
  /**
   * Optional: drop views/tables created by attach.
   */
  detach?(options: DriverDetachOptions): Promise<void>;
}

export type DriverFactory = (context: DriverContext) => IDataSourceDriver;

export interface DatasourceDriverRegistration {
  id: string;
  factory: DriverFactory;
  runtime?: DriverRuntime;
}
