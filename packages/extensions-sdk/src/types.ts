import type { z } from 'zod';

import type { DatasourceDriver } from './datasource.driver';

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
  getDriver: (name: string, config: z.infer<T>) => Promise<DatasourceDriver>;
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
}
