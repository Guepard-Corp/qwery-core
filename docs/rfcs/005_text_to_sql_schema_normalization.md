# Schema Normalization & Enrichment Explained

## The Problem: Different Providers Return Different Formats

Each datasource provider returns schema information in **different formats**. Here's what we're dealing with:

### Example 1: PostgreSQL/PGlite Driver
```typescript
// PGliteDriver.getCurrentSchema() returns a STRING:
`
Database: mydb
Schema: public

Table: users
  - id: integer
  - name: character varying(255)
  - email: character varying(255)
  - created_at: timestamp without time zone

Table: orders
  - id: integer
  - user_id: integer
  - total: numeric(10,2)
`
```

### Example 2: DuckDB
```typescript
// DuckDB returns raw query results:
[
  { column_name: 'id', column_type: 'INTEGER' },
  { column_name: 'name', column_type: 'VARCHAR' },
  { column_name: 'email', column_type: 'VARCHAR' }
]
```

### Example 3: MySQL Driver (hypothetical)
```typescript
// MySQL information_schema returns:
[
  { COLUMN_NAME: 'id', DATA_TYPE: 'int', COLUMN_TYPE: 'int(11)' },
  { COLUMN_NAME: 'name', DATA_TYPE: 'varchar', COLUMN_TYPE: 'varchar(255)' }
]
```

### Example 4: MongoDB (NoSQL - hypothetical)
```typescript
// MongoDB returns document structure:
{
  users: {
    fields: [
      { name: '_id', type: 'ObjectId' },
      { name: 'name', type: 'String' },
      { name: 'age', type: 'Number' }
    ]
  }
}
```

## Solution: Normalize to SimpleSchema

We need to convert **ALL** of these different formats into a **single, consistent format** that the LLM can understand:

```typescript
// Target format: SimpleSchema
{
  databaseName: 'mydb',
  schemaName: 'public',
  tables: [
    {
      tableName: 'users',
      columns: [
        { columnName: 'id', columnType: 'INTEGER' },
        { columnName: 'name', columnType: 'VARCHAR(255)' },
        { columnName: 'email', columnType: 'VARCHAR(255)' },
        { columnName: 'created_at', columnType: 'TIMESTAMP' }
      ]
    },
    {
      tableName: 'orders',
      columns: [
        { columnName: 'id', columnType: 'INTEGER' },
        { columnName: 'user_id', columnType: 'INTEGER' },
        { columnName: 'total', columnType: 'DECIMAL(10,2)' }
      ]
    }
  ]
}
```

## Normalization Process

### Step 1: Parse Provider-Specific Format

```typescript
// packages/agent-factory-sdk/src/services/schema-extraction/schema-normalizer.ts

export class SchemaNormalizer {
  /**
   * Normalizes different provider schemas to SimpleSchema format
   */
  async normalize(
    providerSchema: unknown, // Could be string, array, object, etc.
    providerType: string
  ): Promise<SimpleSchema> {
    switch (providerType) {
      case 'pglite':
      case 'postgresql':
        return this.normalizePostgreSQL(providerSchema);
      case 'duckdb':
        return this.normalizeDuckDB(providerSchema);
      case 'mysql':
        return this.normalizeMySQL(providerSchema);
      case 'mongodb':
        return this.normalizeMongoDB(providerSchema);
      default:
        throw new Error(`Unsupported provider: ${providerType}`);
    }
  }

  /**
   * PGlite/PostgreSQL returns a formatted string
   * We need to parse it back into structured data
   */
  private normalizePostgreSQL(schemaString: string): SimpleSchema {
    // Parse the string format:
    // "Database: mydb\nSchema: public\n\nTable: users\n  - id: integer\n..."
    
    const lines = schemaString.split('\n');
    let currentTable: Table | null = null;
    const tables: Table[] = [];
    let databaseName = 'unknown';
    let schemaName = 'public';

    for (const line of lines) {
      if (line.startsWith('Database:')) {
        databaseName = line.split(':')[1]?.trim() || 'unknown';
      } else if (line.startsWith('Schema:')) {
        schemaName = line.split(':')[1]?.trim() || 'public';
      } else if (line.startsWith('Table:')) {
        if (currentTable) {
          tables.push(currentTable);
        }
        const tableName = line.split(':')[1]?.trim() || '';
        currentTable = { tableName, columns: [] };
      } else if (line.startsWith('  -') && currentTable) {
        // Parse: "  - id: integer"
        const match = line.match(/^\s*-\s*(\w+):\s*(.+)$/);
        if (match) {
          const [, columnName, columnType] = match;
          currentTable.columns.push({
            columnName,
            columnType: this.normalizeType(columnType, 'postgresql'),
          });
        }
      }
    }

    if (currentTable) {
      tables.push(currentTable);
    }

    return { databaseName, schemaName, tables };
  }

  /**
   * DuckDB returns array of column objects
   */
  private normalizeDuckDB(columns: Array<{ column_name: string; column_type: string }>): SimpleSchema {
    return {
      databaseName: 'duckdb',
      schemaName: 'main',
      tables: [
        {
          tableName: 'my_sheet', // or extract from context
          columns: columns.map(col => ({
            columnName: col.column_name,
            columnType: this.normalizeType(col.column_type, 'duckdb'),
          })),
        },
      ],
    };
  }

  /**
   * Standardize type names across providers
   * PostgreSQL: "character varying(255)" → "VARCHAR(255)"
   * MySQL: "int(11)" → "INTEGER"
   * DuckDB: "INTEGER" → "INTEGER" (already standard)
   */
  private normalizeType(type: string, provider: string): string {
    // PostgreSQL type mapping
    if (provider === 'postgresql' || provider === 'pglite') {
      return type
        .replace(/character varying\((\d+)\)/gi, 'VARCHAR($1)')
        .replace(/character\((\d+)\)/gi, 'CHAR($1)')
        .replace(/integer/gi, 'INTEGER')
        .replace(/bigint/gi, 'BIGINT')
        .replace(/timestamp without time zone/gi, 'TIMESTAMP')
        .replace(/timestamp with time zone/gi, 'TIMESTAMPTZ')
        .replace(/numeric\((\d+),(\d+)\)/gi, 'DECIMAL($1,$2)')
        .replace(/double precision/gi, 'DOUBLE');
    }

    // MySQL type mapping
    if (provider === 'mysql') {
      return type
        .replace(/int\((\d+)\)/gi, 'INTEGER')
        .replace(/varchar\((\d+)\)/gi, 'VARCHAR($1)')
        .replace(/text/gi, 'TEXT');
    }

    // DuckDB is already pretty standard
    return type.toUpperCase();
  }
}
```

### Step 2: Use the Normalizer in Multi-Provider Extractor

```typescript
// packages/agent-factory-sdk/src/services/schema-extraction/multi-provider-schema-extractor.ts

export class MultiProviderSchemaExtractor implements ISchemaExtractor {
  constructor(
    private normalizer: SchemaNormalizer,
    private extensionRegistry: ExtensionRegistry
  ) {}

  async extract(datasourceId: string, config: Record<string, unknown>): Promise<SimpleSchema> {
    // 1. Get extension
    const extension = await this.extensionRegistry.getExtension(datasourceId);
    
    // 2. Get driver
    const driver = await extension.getDriver(datasourceId, config);
    
    // 3. Extract schema (returns provider-specific format)
    const rawSchema = await driver.getCurrentSchema();
    
    // 4. Normalize to SimpleSchema
    return this.normalizer.normalize(rawSchema, extension.id);
  }
}
```

## Enrichment: Adding Extra Metadata

**Enrichment** means adding **additional helpful information** that wasn't in the original schema, to help the LLM generate better SQL.

### What We Can Enrich:

1. **Sample Data**: First 5 rows from each table
2. **Column Statistics**: Min, max, distinct count, null count
3. **Constraints**: Primary keys, foreign keys, unique constraints
4. **Indexes**: Which columns are indexed (for query optimization hints)

### Example: Enriched Schema

```typescript
// Original SimpleSchema
{
  databaseName: 'mydb',
  schemaName: 'public',
  tables: [
    {
      tableName: 'users',
      columns: [
        { columnName: 'id', columnType: 'INTEGER' },
        { columnName: 'name', columnType: 'VARCHAR(255)' },
        { columnName: 'email', columnType: 'VARCHAR(255)' }
      ]
    }
  ]
}

// After Enrichment
{
  databaseName: 'mydb',
  schemaName: 'public',
  tables: [
    {
      tableName: 'users',
      columns: [
        {
          columnName: 'id',
          columnType: 'INTEGER',
          isPrimaryKey: true,
          sampleValues: [1, 2, 3, 4, 5],
          stats: { min: 1, max: 1000, distinctCount: 1000, nullCount: 0 }
        },
        {
          columnName: 'name',
          columnType: 'VARCHAR(255)',
          sampleValues: ['John', 'Jane', 'Bob', 'Alice', 'Charlie'],
          stats: { distinctCount: 850, nullCount: 0 }
        },
        {
          columnName: 'email',
          columnType: 'VARCHAR(255)',
          isUnique: true,
          sampleValues: ['john@example.com', 'jane@example.com', ...],
          stats: { distinctCount: 1000, nullCount: 0 }
        }
      ],
      sampleRows: [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
        // ... 3 more rows
      ],
      rowCount: 1000,
      indexes: ['id', 'email'] // These columns have indexes
    }
  ]
}
```

### Implementation: Schema Enricher

```typescript
// packages/agent-factory-sdk/src/services/schema-extraction/schema-enricher.ts

export class SchemaEnricher {
  constructor(private driver: DatasourceDriver) {}

  async enrich(schema: SimpleSchema, options?: { includeSamples?: boolean }): Promise<EnrichedSchema> {
    const enrichedTables = await Promise.all(
      schema.tables.map(async (table) => {
        // 1. Get sample rows (optional, for better LLM context)
        const sampleRows = options?.includeSamples
          ? await this.getSampleRows(table.tableName, 5)
          : undefined;

        // 2. Get column statistics
        const enrichedColumns = await Promise.all(
          table.columns.map(async (column) => {
            const stats = await this.getColumnStats(table.tableName, column.columnName);
            const sampleValues = await this.getSampleValues(table.tableName, column.columnName, 5);
            
            return {
              ...column,
              sampleValues,
              stats,
              // Could also add: isPrimaryKey, isForeignKey, isUnique, etc.
            };
          })
        );

        // 3. Get table metadata
        const rowCount = await this.getRowCount(table.tableName);
        const indexes = await this.getIndexes(table.tableName);

        return {
          ...table,
          columns: enrichedColumns,
          sampleRows,
          rowCount,
          indexes,
        };
      })
    );

    return {
      ...schema,
      tables: enrichedTables,
    };
  }

  private async getSampleRows(tableName: string, limit: number): Promise<Record<string, unknown>[]> {
    const result = await this.driver.query(`SELECT * FROM ${tableName} LIMIT ${limit}`);
    return result.rows;
  }

  private async getColumnStats(tableName: string, columnName: string) {
    // Run queries like:
    // SELECT COUNT(DISTINCT column_name) FROM table_name
    // SELECT MIN(column_name), MAX(column_name) FROM table_name
    // SELECT COUNT(*) FROM table_name WHERE column_name IS NULL
    // ... return aggregated stats
  }

  private async getSampleValues(tableName: string, columnName: string, limit: number): Promise<unknown[]> {
    const result = await this.driver.query(
      `SELECT DISTINCT ${columnName} FROM ${tableName} LIMIT ${limit}`
    );
    return result.rows.map(row => row[columnName]);
  }

  private async getRowCount(tableName: string): Promise<number> {
    const result = await this.driver.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result.rows[0]?.count || 0;
  }

  private async getIndexes(tableName: string): Promise<string[]> {
    // Query system tables to get index information
    // PostgreSQL: SELECT indexname FROM pg_indexes WHERE tablename = $1
    // MySQL: SHOW INDEXES FROM table_name
    // Return array of column names that have indexes
  }
}
```

## Why This Matters for Text-to-SQL

### Without Normalization:
- LLM gets inconsistent schema formats
- Can't reliably generate SQL across different providers
- Hard to cache schemas (different formats = cache misses)

### Without Enrichment:
- LLM doesn't know what actual data looks like
- Can't make smart decisions (e.g., "show me users" → should it limit results?)
- Can't optimize queries (doesn't know which columns are indexed)

### With Normalization + Enrichment:
- **Consistent format** → Better LLM understanding
- **Sample data** → LLM sees real values, generates more accurate queries
- **Statistics** → LLM can add appropriate LIMITs, use indexed columns
- **Cacheable** → Same format = easy to cache and compare

## Real Example: How It Works

```typescript
// User asks: "Show me the top 5 users by name"

// 1. Get schema (normalized)
const schema = await extractor.extract('postgresql-datasource-id', config);
// Returns: SimpleSchema with tables, columns, types

// 2. Enrich with samples (optional, but helpful)
const enriched = await enricher.enrich(schema, { includeSamples: true });
// Now schema has sampleRows showing actual user names

// 3. Pass to LLM for SQL generation
const prompt = `
Schema:
${formatSchemaForLLM(enriched)}

Sample data from users table:
${enriched.tables[0].sampleRows}

User query: "Show me the top 5 users by name"
Generate SQL:
`;

// LLM sees:
// - Column names: id, name, email
// - Actual sample data: ['John', 'Jane', 'Bob', ...]
// - Row count: 1000
// - Indexes: ['id', 'email'] (name is NOT indexed)

// LLM generates:
// "SELECT * FROM users ORDER BY name LIMIT 5"
// (Smart enough to add LIMIT because it knows there are 1000 rows)
```

## Summary

- **Normalize**: Convert different provider formats → `SimpleSchema` (consistent structure)
- **Enrich**: Add sample data, statistics, constraints → Better LLM context
- **Result**: More accurate SQL generation, better caching, easier optimization


