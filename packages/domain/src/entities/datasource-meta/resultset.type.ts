import { z } from 'zod';

/**
 * Normalized column types for frontend visualization.
 * These types are database-agnostic and help the frontend adapt rendering.
 */
export const ColumnTypeSchema = z.enum([
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'time',
  'json',
  'jsonb',
  'array',
  'blob',
  'binary',
  'uuid',
  'decimal',
  'float',
  'null',
  'unknown',
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

/**
 * Statistics about query execution results.
 * Extendable by other libraries using .extend() or .merge().
 */
export const DatasourceResultStatSchema = z
  .object({
    rowsAffected: z
      .number()
      .int()
      .min(0)
      .describe('Number of rows affected by the query'),
    rowsRead: z
      .number()
      .int()
      .min(0)
      .nullable()
      .describe('Number of rows read during query execution'),
    rowsWritten: z
      .number()
      .int()
      .min(0)
      .nullable()
      .describe('Number of rows written during query execution'),
    queryDurationMs: z
      .number()
      .min(0)
      .nullable()
      .describe('Query execution duration in milliseconds'),
  })
  .passthrough();

export type DatasourceResultStat = z.infer<typeof DatasourceResultStatSchema>;

/**
 * Column header metadata for query results.
 * Extendable by other libraries using .extend() or .merge().
 * Example:
 * ```ts
 * const ExtendedColumnHeaderSchema = ColumnHeaderSchema.extend({
 *   customField: z.string().optional(),
 * });
 * ```
 */
export const ColumnHeaderSchema = z
  .object({
    /**
     * The key of row data that this column represents.
     */
    name: z
      .string()
      .min(1)
      .describe('The key of row data that this column represents'),
    /**
     * The display name of the column. This is the name that should be used when displaying the column to the user.
     */
    displayName: z.string().min(1).describe('The display name of the column'),
    /**
     * The original type of the column returned from database driver.
     * This is database-specific (e.g., 'VARCHAR', 'INTEGER', 'TIMESTAMP', 'BIGINT').
     */
    originalType: z
      .string()
      .nullable()
      .describe('The original database-specific type of the column'),
    /**
     * Normalized type hint for client rendering and visualization.
     * Frontend should use this to adapt visualization (e.g., date pickers for dates, number formatting for numbers).
     */
    type: ColumnTypeSchema.optional().describe(
      'Normalized type hint for frontend visualization',
    ),
    /**
     * Database name or schema name
     */
    schema: z.string().optional().describe('Database name or schema name'),
    /**
     * The actual table name
     */
    table: z.string().optional().describe('The actual table name'),
    /**
     * The original column name returned from database driver.
     */
    originalName: z
      .string()
      .optional()
      .describe('The original column name returned from database driver'),
    /**
     * Indicate if this column is a primary key.
     */
    primaryKey: z
      .boolean()
      .optional()
      .describe('Indicate if this column is a primary key'),
    /**
     * The column id in the table. Useful for Postgres and other databases that expose column OIDs.
     */
    columnId: z
      .number()
      .int()
      .optional()
      .describe('The column id in the table (useful for Postgres OIDs)'),
    /**
     * The table id in the database. Useful for Postgres and other databases that expose table OIDs.
     */
    tableId: z
      .number()
      .int()
      .optional()
      .describe('The table id in the database (useful for Postgres OIDs)'),
  })
  .passthrough();

export type ColumnHeader = z.infer<typeof ColumnHeaderSchema>;

/**
 * A single row of data from query results.
 */
export const DatasourceRowSchema = z.record(z.unknown());

export type DatasourceRow = z.infer<typeof DatasourceRowSchema>;

/**
 * Complete result set from a datasource query execution.
 * Extendable by other libraries using .extend() or .merge().
 * Example:
 * ```ts
 * const ExtendedResultSetSchema = DatasourceResultSetSchema.extend({
 *   metadata: z.object({ custom: z.string() }).optional(),
 * });
 * ```
 */
export const DatasourceResultSetZodSchema = z
  .object({
    rows: z.array(DatasourceRowSchema).describe('Array of result rows'),
    columns: z.array(ColumnHeaderSchema).describe('Array of column metadata'),
    stat: DatasourceResultStatSchema.describe('Query execution statistics'),
  })
  .passthrough();

export type DatasourceResultSet = z.infer<typeof DatasourceResultSetZodSchema>;
