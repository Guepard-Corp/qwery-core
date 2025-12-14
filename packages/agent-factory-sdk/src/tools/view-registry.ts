import { nanoid } from 'nanoid';
import type { SimpleSchema, SimpleColumn } from '@qwery/domain/entities';

export interface ViewRecord {
  viewName: string; // Technical name (unique, sanitized) - for foreign DBs, this is the queryable path like "attached_db.schema.table"
  displayName: string; // Semantic name for users
  sourceId: string;
  sharedLink: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  schema?: SimpleSchema; // Cached schema
  // Multi-datasource support (optional for backward compatibility)
  datasourceId?: string; // Datasource ID from conversation
  datasourceProvider?: string; // Extension ID (e.g., 'gsheet-csv', 'postgresql')
  datasourceType?: 'duckdb-native' | 'foreign-database'; // Type of datasource
  connectionConfig?: Record<string, unknown>; // For reconnection
  // Foreign database specific
  attachedDatabaseName?: string; // Name of attached database (for foreign DBs)
  foreignSchema?: string; // Original schema name in foreign database
  foreignTable?: string; // Original table name in foreign database
}

export interface RegistryContext {
  conversationDir: string;
}

const REGISTRY_FILE = 'views.json';
const SHEET_REGEX =
  /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

const sanitizeViewName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `v_${cleaned}`;
};

/**
 * Pluralize a word
 */
function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (
    lower.endsWith('y') &&
    !lower.endsWith('ay') &&
    !lower.endsWith('ey') &&
    !lower.endsWith('oy') &&
    !lower.endsWith('uy')
  ) {
    return lower.slice(0, -1) + 'ies';
  }
  if (
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    return lower + 'es';
  }
  return lower + 's';
}

/**
 * Infer entity name from column name
 */
function inferEntityName(columnName: string): string {
  let name = columnName.toLowerCase();

  // Remove _id suffix
  name = name.replace(/_id$/, '');

  // Remove common prefixes
  name = name.replace(
    /^(user_|customer_|order_|product_|dept_|driver_|restaurant_|employee_|transaction_|item_)/,
    '',
  );

  // Convert to singular entity name
  const words = name.split('_').filter((w) => w.length > 0);
  if (words.length === 0) return columnName;

  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Detect entity patterns from columns (PATTERN-BASED, domain-agnostic)
 */
function detectEntityPatterns(
  columns: Array<{ columnName: string; columnType: string }>,
): string[] {
  const patterns: string[] = [];

  for (const col of columns) {
    const name = col.columnName;
    const lower = name.toLowerCase();

    // Pattern 1: ID columns (e.g., "user_id", "recipe_id")
    if (lower.endsWith('_id') || lower === 'id') {
      const entity = inferEntityName(col.columnName);
      if (entity && entity !== col.columnName) {
        patterns.push(entity);
      }
    }

    // Pattern 2: Capitalized single word (e.g., "Athlete", "Recipe", "Book")
    // These are strong indicators of primary entities
    if (/^[A-Z][a-z]+$/.test(name) && name.length > 2) {
      patterns.push(name); // Use as-is
    }

    // Pattern 3: Plural form (e.g., "Athletes", "Recipes", "Books")
    if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
      const singular = lower.slice(0, -1);
      if (singular.length > 2) {
        const capitalized =
          singular.charAt(0).toUpperCase() + singular.slice(1);
        patterns.push(capitalized);
      }
    }
  }

  // Return unique patterns, sorted by prominence (capitalized single words first)
  const unique = [...new Set(patterns)];
  return unique.sort((a, b) => {
    // Prioritize capitalized single words (strong entity indicators)
    const aIsCapitalized = /^[A-Z][a-z]+$/.test(a);
    const bIsCapitalized = /^[A-Z][a-z]+$/.test(b);
    if (aIsCapitalized && !bIsCapitalized) return -1;
    if (!aIsCapitalized && bIsCapitalized) return 1;
    return 0;
  });
}

/**
 * Infer from column names (PATTERN-BASED, domain-agnostic)
 */
function inferFromColumnNames(
  columns: Array<{ columnName: string; columnType: string }>,
): string | null {
  // Strategy 1: Look for most prominent entity pattern
  const patterns = detectEntityPatterns(columns);
  if (patterns.length > 0 && patterns[0]) {
    return pluralize(patterns[0].toLowerCase());
  }

  // Strategy 2: Look for capitalized single-word columns (strong entity indicators)
  const capitalizedColumns = columns
    .filter(
      (c) => /^[A-Z][a-z]+$/.test(c.columnName) && c.columnName.length > 2,
    )
    .map((c) => c.columnName);

  if (capitalizedColumns.length > 0) {
    // Use the first capitalized column as the primary entity
    const firstCol = capitalizedColumns[0];
    if (firstCol) {
      return pluralize(firstCol.toLowerCase());
    }
  }

  // Strategy 3: Look for name/title columns and infer entity
  const nameColumns = columns.filter((c) => {
    const lower = c.columnName.toLowerCase();
    return (
      lower.includes('name') ||
      lower.includes('title') ||
      lower.includes('label')
    );
  });

  if (nameColumns.length > 0) {
    const nameCol = nameColumns[0];
    if (nameCol) {
      // Extract entity from column name (e.g., "recipe_name" → "recipe")
      const words = nameCol.columnName.toLowerCase().split(/[_\s-]/);
      if (words.length > 1 && words[0]) {
        const entity = words[0];
        return pluralize(entity);
      }
    }
  }

  // Strategy 4: Use first column if it looks like an entity
  if (columns.length > 0) {
    const firstCol = columns[0];
    if (firstCol) {
      const name = firstCol.columnName;
      // If first column is capitalized single word, use it
      if (/^[A-Z][a-z]+$/.test(name)) {
        return pluralize(name.toLowerCase());
      }
    }
  }

  return null;
}

/**
 * Generate semantic view name from schema
 */
export function generateSemanticViewName(
  schema: SimpleSchema,
  existingNames: string[] = [],
): string {
  const table = schema.tables[0];
  if (!table) return 'data';

  let semanticName: string | null = null;

  // Strategy 1: Look for primary entity indicators (ID columns)
  const idColumns = table.columns.filter((c: SimpleColumn) => {
    const name = c.columnName.toLowerCase();
    return name.endsWith('_id') || name === 'id';
  });

  if (idColumns.length > 0) {
    const primaryId = idColumns[0];
    if (primaryId) {
      const entityName = inferEntityName(primaryId.columnName);
      semanticName = pluralize(entityName.toLowerCase());
    }
  }

  // Strategy 2: Use most common entity pattern
  if (!semanticName) {
    const entityPatterns = detectEntityPatterns(table.columns);
    if (entityPatterns.length > 0 && entityPatterns[0]) {
      semanticName = pluralize(entityPatterns[0].toLowerCase());
    }
  }

  // Strategy 3: Infer from column names
  if (!semanticName) {
    semanticName = inferFromColumnNames(table.columns);
  }

  // Strategy 4: Use table name as fallback (better than generic "data")
  if (!semanticName && table.tableName) {
    // Try to infer from table name
    const tableName = table.tableName.toLowerCase();
    // Remove common prefixes/suffixes
    const cleanName = tableName
      .replace(/^tbl_/, '')
      .replace(/^table_/, '')
      .replace(/_table$/, '')
      .replace(/s$/, ''); // Remove plural 's'

    if (cleanName.length > 2) {
      semanticName = pluralize(cleanName);
    }
  }

  // Fallback to table name or generic "data"
  if (!semanticName) {
    semanticName = table.tableName ? sanitizeViewName(table.tableName) : 'data';
  }

  // Sanitize
  const viewName = sanitizeViewName(semanticName);

  // Ensure uniqueness
  let finalName = viewName;
  let counter = 1;
  while (existingNames.includes(finalName)) {
    finalName = `${viewName}_${counter}`;
    counter += 1;
  }

  return finalName;
}

const ensureConversationDir = async (
  context: RegistryContext,
): Promise<string> => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(context.conversationDir, { recursive: true });
  return context.conversationDir;
};

const registryPath = async (context: RegistryContext): Promise<string> => {
  const { join } = await import('node:path');
  return join(context.conversationDir, REGISTRY_FILE);
};

export const loadViewRegistry = async (
  context: RegistryContext,
): Promise<ViewRecord[]> => {
  await ensureConversationDir(context);
  const { readFile } = await import('node:fs/promises');
  try {
    const file = await readFile(await registryPath(context), 'utf-8');
    return JSON.parse(file) as ViewRecord[];
  } catch {
    return [];
  }
};

export const saveViewRegistry = async (
  context: RegistryContext,
  records: ViewRecord[],
) => {
  await ensureConversationDir(context);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(
    await registryPath(context),
    JSON.stringify(records, null, 2),
    {
      encoding: 'utf-8',
    },
  );
};

export const registerSheetView = async (
  context: RegistryContext,
  sharedLink: string,
  viewName: string,
  displayName?: string,
  schema?: SimpleSchema,
): Promise<{ record: ViewRecord; isNew: boolean }> => {
  await ensureConversationDir(context);
  const existing = await loadViewRegistry(context);
  const sourceId = sharedLink.match(SHEET_REGEX)?.[1] ?? `sheet_${nanoid(8)}`;

  const match = existing.find((rec) => rec.sourceId === sourceId);
  if (match) {
    match.updatedAt = new Date().toISOString();
    match.lastUsedAt = new Date().toISOString();
    // Update viewName and displayName if provided
    if (viewName && viewName !== match.viewName) {
      match.viewName = viewName;
    }
    if (displayName) {
      match.displayName = displayName;
    }
    if (schema) {
      match.schema = schema;
    }
    await saveViewRegistry(context, existing);
    return { record: match, isNew: false };
  }

  const now = new Date().toISOString();
  const newRecord: ViewRecord = {
    viewName,
    displayName: displayName || viewName,
    sourceId,
    sharedLink,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    schema,
  };
  existing.push(newRecord);
  await saveViewRegistry(context, existing);
  return { record: newRecord, isNew: true };
};

/**
 * Register a view from a datasource (supports multi-datasource)
 */
export const registerDatasourceView = async (
  context: RegistryContext,
  sourceId: string, // Can be datasource ID, table identifier, or Google Sheet ID
  viewName: string,
  displayName?: string,
  schema?: SimpleSchema,
  options?: {
    datasourceId?: string;
    datasourceProvider?: string;
    datasourceType?: 'duckdb-native' | 'foreign-database';
    connectionConfig?: Record<string, unknown>;
    sharedLink?: string; // For backward compatibility with Google Sheets
    attachedDatabaseName?: string; // Name of attached database (for foreign DBs)
    foreignSchema?: string; // Original schema name in foreign database
    foreignTable?: string; // Original table name in foreign database
  },
): Promise<{ record: ViewRecord; isNew: boolean }> => {
  await ensureConversationDir(context);
  const existing = await loadViewRegistry(context);

  // Try to find existing view by sourceId or datasourceId
  const match =
    existing.find((rec) => rec.sourceId === sourceId) ||
    (options?.datasourceId
      ? existing.find((rec) => rec.datasourceId === options.datasourceId)
      : null);

  if (match) {
    match.updatedAt = new Date().toISOString();
    match.lastUsedAt = new Date().toISOString();
    // Update fields if provided
    if (viewName && viewName !== match.viewName) {
      match.viewName = viewName;
    }
    if (displayName) {
      match.displayName = displayName;
    }
    if (schema) {
      match.schema = schema;
    }
    if (options) {
      if (options.datasourceId) match.datasourceId = options.datasourceId;
      if (options.datasourceProvider)
        match.datasourceProvider = options.datasourceProvider;
      if (options.datasourceType) match.datasourceType = options.datasourceType;
      if (options.connectionConfig)
        match.connectionConfig = options.connectionConfig;
      if (options.sharedLink) match.sharedLink = options.sharedLink;
      if (options.attachedDatabaseName)
        match.attachedDatabaseName = options.attachedDatabaseName;
      if (options.foreignSchema) match.foreignSchema = options.foreignSchema;
      if (options.foreignTable) match.foreignTable = options.foreignTable;
    }
    await saveViewRegistry(context, existing);
    return { record: match, isNew: false };
  }

  const now = new Date().toISOString();
  const newRecord: ViewRecord = {
    viewName,
    displayName: displayName || viewName,
    sourceId,
    sharedLink: options?.sharedLink || sourceId, // Fallback to sourceId if no sharedLink
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    schema,
    ...(options?.datasourceId && { datasourceId: options.datasourceId }),
    ...(options?.datasourceProvider && {
      datasourceProvider: options.datasourceProvider,
    }),
    ...(options?.datasourceType && { datasourceType: options.datasourceType }),
    ...(options?.connectionConfig && {
      connectionConfig: options.connectionConfig,
    }),
    ...(options?.attachedDatabaseName && {
      attachedDatabaseName: options.attachedDatabaseName,
    }),
    ...(options?.foreignSchema && { foreignSchema: options.foreignSchema }),
    ...(options?.foreignTable && { foreignTable: options.foreignTable }),
  };
  existing.push(newRecord);
  await saveViewRegistry(context, existing);
  return { record: newRecord, isNew: true };
};

/**
 * Update view name and display name
 */
export const updateViewName = async (
  context: RegistryContext,
  sourceId: string,
  viewName: string,
  displayName?: string,
): Promise<void> => {
  const registry = await loadViewRegistry(context);
  const target = registry.find((record) => record.sourceId === sourceId);
  if (!target) return;
  target.viewName = viewName;
  if (displayName) {
    target.displayName = displayName;
  }
  target.updatedAt = new Date().toISOString();
  await saveViewRegistry(context, registry);
};

/**
 * Validate view exists in database
 */
export const validateViewExists = async (
  dbPath: string,
  viewName: string,
): Promise<boolean> => {
  try {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const escapedViewName = viewName.replace(/"/g, '""');
      await conn.run(`SELECT 1 FROM "${escapedViewName}" LIMIT 1`);
      return true;
    } catch {
      return false;
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch {
    return false;
  }
};

/**
 * Rename view in database
 */
export const renameView = async (
  dbPath: string,
  oldName: string,
  newName: string,
): Promise<void> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(dbPath);
  const conn = await instance.connect();

  try {
    const escapedOldName = oldName.replace(/"/g, '""');
    const escapedNewName = newName.replace(/"/g, '""');
    await conn.run(
      `ALTER VIEW "${escapedOldName}" RENAME TO "${escapedNewName}"`,
    );
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

/**
 * Check if table/view name is a system or temp table
 */
export function isSystemOrTempTable(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return (
    name.startsWith('temp_') ||
    name.startsWith('pragma_') ||
    name === 'information_schema' ||
    name.includes('_temp') ||
    name.includes('_tmp') ||
    name.startsWith('pg_') ||
    name.startsWith('sqlite_') ||
    name.startsWith('duckdb_') ||
    name.startsWith('main.') ||
    name.startsWith('temp.')
  );
}

/**
 * Validate table/view exists in database
 */
export const validateTableExists = async (
  dbPath: string,
  tableName: string,
): Promise<boolean> => {
  try {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const escapedName = tableName.replace(/"/g, '""');
      // Try to query the table/view
      await conn.run(`SELECT 1 FROM "${escapedName}" LIMIT 1`);
      return true;
    } catch {
      return false;
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch {
    return false;
  }
};

/**
 * Drop table/view from database
 */
export const dropTable = async (
  dbPath: string,
  tableName: string,
): Promise<void> => {
  try {
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const escapedName = tableName.replace(/"/g, '""');
      await conn.run(`DROP VIEW IF EXISTS "${escapedName}"`);
      await conn.run(`DROP TABLE IF EXISTS "${escapedName}"`);
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch {
    // Ignore errors during cleanup
  }
};

/**
 * Create view from existing table/view
 */
export const createViewFromTable = async (
  dbPath: string,
  viewName: string,
  sourceTableName: string,
): Promise<void> => {
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const instance = await DuckDBInstance.create(dbPath);
  const conn = await instance.connect();

  try {
    const escapedViewName = viewName.replace(/"/g, '""');
    const escapedSourceName = sourceTableName.replace(/"/g, '""');
    await conn.run(
      `CREATE OR REPLACE VIEW "${escapedViewName}" AS SELECT * FROM "${escapedSourceName}"`,
    );
  } finally {
    conn.closeSync();
    instance.closeSync();
  }
};

/**
 * List all tables/views in database using queryEngine
 * @deprecated This function is not used in production code. Consider using queryEngine.metadata() instead.
 */
export const listAllTables = async (
  conversationId: string,
  workspace: string,
  queryEngine: import('@qwery/domain/ports').AbstractQueryEngine,
): Promise<string[]> => {
  const allTables: string[] = [];

  // Get system schema filter
  const { getAllSystemSchemas, isSystemTableName } = await import(
    './system-schema-filter'
  );
  const allSystemSchemas = getAllSystemSchemas();

  // Query all databases (main + attached) using pragma_database_list
  const databasesQuery = 'SELECT name FROM pragma_database_list;';

  const dbResult = await queryEngine.query(databasesQuery);
  const databases = dbResult.rows.map((r) => ({
    database_name: r.name as string,
  }));

  for (const db of databases) {
    const dbName = db.database_name;

    // Skip system databases
    if (dbName === 'temp' || dbName.startsWith('_')) {
      continue;
    }

    // Query tables and views from this database
    // For main database, query without database prefix
    let tablesQuery: string;
    if (dbName === 'main') {
      tablesQuery = `
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'main'
          AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_schema, table_name
      `;
    } else {
      // For attached databases, use database prefix
      tablesQuery = `
        SELECT table_schema, table_name, table_type
        FROM ${dbName}.information_schema.tables
        WHERE table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_schema, table_name
      `;
    }

    try {
      const tablesResult = await queryEngine.query(tablesQuery);
      const tables = tablesResult.rows as Array<{
        table_schema: string;
        table_name: string;
        table_type: string;
      }>;

      for (const table of tables) {
        const schemaName = (table.table_schema || 'main').toLowerCase();

        // Skip system schemas (NO LOGGING - just skip silently)
        if (allSystemSchemas.has(schemaName)) {
          continue;
        }

        // Skip system tables (NO LOGGING - just skip silently)
        if (isSystemTableName(table.table_name)) {
          continue;
        }

        // Format table name
        if (dbName === 'main') {
          // Main database: just table name
          allTables.push(table.table_name);
        } else {
          // Attached database: full path
          allTables.push(
            `${dbName}.${table.table_schema || 'main'}.${table.table_name}`,
          );
        }
      }
    } catch (error) {
      // If query fails for this database, skip it
      // Only log if it's unexpected (not a permission/system issue)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        !errorMsg.includes('does not exist') &&
        !errorMsg.includes('permission')
      ) {
        console.warn(
          `[ViewRegistry] Failed to query database ${dbName}: ${errorMsg}`,
        );
      }
    }
  }

  return allTables;
};

/**
 * Extract timestamp from temp table name (temp_1234567890_abc)
 */
function extractTimestampFromTempName(tableName: string): number | null {
  const match = tableName.match(/^temp_(\d+)_/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Clean up orphaned temp tables older than 1 hour
 * Note: This function still uses dbPath for backward compatibility
 * Consider refactoring to use centralized manager if needed
 */
export const cleanupOrphanedTempTables = async (
  dbPath: string,
): Promise<void> => {
  try {
    // For cleanup, we still use dbPath directly since this is a maintenance operation
    // that may run outside the normal conversation context
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const viewsReader = await conn.runAndReadAll(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'main'
        UNION
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
      `);
      await viewsReader.readAll();
      const rows = viewsReader.getRowObjectsJS() as Array<{
        table_name: string;
      }>;
      const tables = rows.map((r) => r.table_name);
      const tempTables = tables.filter((t) => t.startsWith('temp_'));

      for (const table of tempTables) {
        const timestamp = extractTimestampFromTempName(table);
        if (timestamp && Date.now() - timestamp > 3600000) {
          // Older than 1 hour
          await dropTable(dbPath, table);
        }
      }
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  } catch (error) {
    // Log but don't throw
    console.warn('[ViewRegistry] Failed to cleanup temp tables:', error);
  }
};

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 100,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError!;
}

/**
 * Format view creation error for user
 */
export function formatViewCreationError(
  error: Error,
  sharedLink: string,
): string {
  const errorMsg = error.message;

  if (
    errorMsg.includes('does not exist') ||
    errorMsg.includes('Table') ||
    errorMsg.includes('View')
  ) {
    return (
      `Failed to create view from Google Sheet. The sheet may be inaccessible or the connection timed out. ` +
      `Please verify the sheet is shared publicly or check your permissions. ` +
      `Link: ${sharedLink}`
    );
  }

  if (errorMsg.includes('Catalog Error') || errorMsg.includes('Catalog')) {
    return (
      `Database error while creating view. This might be a temporary issue. ` +
      `Please try again in a moment. If the problem persists, the sheet format may be incompatible.`
    );
  }

  if (
    errorMsg.includes('timeout') ||
    errorMsg.includes('network') ||
    errorMsg.includes('fetch')
  ) {
    return `Network error while accessing Google Sheet. Please check your internet connection and try again.`;
  }

  return `Failed to create view: ${errorMsg}. Please verify the Google Sheet is accessible and try again.`;
}

export const updateViewUsage = async (
  context: RegistryContext,
  viewName?: string,
) => {
  if (!viewName) {
    return;
  }
  const registry = await loadViewRegistry(context);
  const target = registry.find((record) => record.viewName === viewName);
  if (!target) return;
  target.lastUsedAt = new Date().toISOString();
  target.updatedAt = target.lastUsedAt;
  await saveViewRegistry(context, registry);
};
