import { z } from 'zod/v3';

import type { DatasourceFormConfigPayload } from './form-config';
import type { DatasourceMetadata, DatasourceResultSet } from './metadata';

/**
 * Datasource plugin interface
 * Each plugin defines its own schema, metadata, and connection string builder
 */
export interface DatasourceExtension<T extends z.ZodTypeAny = z.ZodTypeAny> {
  /**
   * Unique identifier for the extension
   */
  id: string;

  /**
   * Display name for the datasource
   */
  name: string;

  /**
   * Logo path (relative to public folder or absolute URL)
   */
  logo: string;

  /**
   * Optional description of the datasource
   */
  description?: string;

  /**
   * Categories/tags for filtering (e.g., ['SQL', 'NoSQL', 'SaaS', 'Files'])
   */
  tags?: string[];

  /**
   * Zod schema defining the connection configuration fields
   */
  schema: T;

  /**
   * Optional form config for create-datasource UI (placeholders, labels, docs, preset).
   */
  formConfig?: DatasourceFormConfigPayload | null;

  /**
   * Optional scope of the extension
   */
  scope?: ExtensionScope;

  /**
   * Optional parent extension of the extension if ExtensionScope is DRIVER
   */
  parent?: string;

  /**
   * unction to get the driver for the extension
   * @param config - The configuration for the extension
   * @returns The driver for the extension
   */
  getDriver: (name: string, config: z.infer<T>) => Promise<IDataSourceDriver>;
}

export enum ExtensionScope {
  DATASOURCE = 'datasource',
  DRIVER = 'driver',
}

/**
 * Extension metadata (for listing without loading full extension)
 */
export interface ExtensionMetadata {
  id: string;
  name: string;
  logo: string;
  description?: string;
  tags?: string[];
  scope: ExtensionScope;
  schema: z.ZodTypeAny;
  formConfig?: DatasourceFormConfigPayload | null;
}

// v0 driver/runtime contracts
export type DriverRuntime = 'node' | 'browser';

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
  /** Datasource config (sharedLink, url, connection string, etc.) */
  config: unknown;
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
  config: unknown;
  /** Schema name used at attach (so driver knows what to drop) */
  schemaName?: string;
  /** Names of views/tables to drop (or driver can derive from config) */
  tableNames?: string[];
  conversationId?: string;
  workspace?: string;
}

export interface IDataSourceDriver {
  testConnection(config: unknown): Promise<void>;
  query(sql: string, config: unknown): Promise<DatasourceResultSet>;
  metadata(config: unknown): Promise<DatasourceMetadata>;
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
