# Schema Versioning & Normalized Schema Formats

## Normalized Schema Formats

### SQL Databases Format

```typescript
// packages/domain/src/entities/schema.type.ts

export type SQLNormalizedSchema = {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: 'string' | 'integer' | 'boolean' | 'float' | 'datetime' | 'json' | 'binary';
      nullable: boolean;
      default: string | null;
      primary_key: boolean;
      unique: boolean;
    }>;
    indexes: Array<{
      columns: string[];
      unique: boolean;
    }>;
    foreign_keys: Array<{
      column: string;
      references: string; // Format: "other_table.column"
    }>;
  }>;
};

// Example:
{
  "tables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "integer",
          "nullable": false,
          "default": null,
          "primary_key": true,
          "unique": true
        },
        {
          "name": "email",
          "type": "string",
          "nullable": false,
          "default": null,
          "primary_key": false,
          "unique": true
        },
        {
          "name": "created_at",
          "type": "datetime",
          "nullable": false,
          "default": "CURRENT_TIMESTAMP",
          "primary_key": false,
          "unique": false
        }
      ],
      "indexes": [
        { "columns": ["email"], "unique": true },
        { "columns": ["created_at"], "unique": false }
      ],
      "foreign_keys": []
    },
    {
      "name": "orders",
      "columns": [
        {
          "name": "id",
          "type": "integer",
          "nullable": false,
          "default": null,
          "primary_key": true,
          "unique": true
        },
        {
          "name": "user_id",
          "type": "integer",
          "nullable": false,
          "default": null,
          "primary_key": false,
          "unique": false
        }
      ],
      "indexes": [],
      "foreign_keys": [
        { "column": "user_id", "references": "users.id" }
      ]
    }
  ]
}
```

### NoSQL Databases Format

```typescript
export type NoSQLNormalizedSchema = {
  collections: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: 'string' | 'integer' | 'boolean' | 'float' | 'datetime' | 'json' | 'binary' | 'array';
      nullable: boolean;
      default: string | null;
      unique: boolean;
    }>;
    indexes: Array<{
      fields: string[];
      unique: boolean;
    }>;
  }>;
};

// Example (MongoDB):
{
  "collections": [
    {
      "name": "users",
      "fields": [
        {
          "name": "_id",
          "type": "string",
          "nullable": false,
          "default": null,
          "unique": true
        },
        {
          "name": "email",
          "type": "string",
          "nullable": false,
          "default": null,
          "unique": true
        },
        {
          "name": "tags",
          "type": "array",
          "nullable": true,
          "default": null,
          "unique": false
        }
      ],
      "indexes": [
        { "fields": ["email"], "unique": true },
        { "fields": ["_id"], "unique": true }
      ]
    }
  ]
}
```

### Unified Schema Type

```typescript
export type NormalizedSchema = 
  | { type: 'sql'; schema: SQLNormalizedSchema }
  | { type: 'nosql'; schema: NoSQLNormalizedSchema };

export type SchemaVersion = {
  datasourceId: string;
  version: number;
  schemaHash: string; // MD5/SHA256 hash of normalized schema JSON
  normalizedSchema: NormalizedSchema;
  createdAt: Date;
};
```

## Schema Versioning Implementation

### Version Table Structure

```sql
-- SQL Databases
CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datasource_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  schema_hash TEXT NOT NULL,
  schema_json TEXT NOT NULL,  -- JSON string of NormalizedSchema
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(datasource_id, version)
);

CREATE INDEX idx_schema_migrations_datasource ON schema_migrations(datasource_id);
CREATE INDEX idx_schema_migrations_version ON schema_migrations(datasource_id, version DESC);
```

### Version Extraction Service

```typescript
// packages/agent-factory-sdk/src/services/schema-versioning/schema-version-extractor.ts

import { createHash } from 'crypto';
import type { DatasourceDriver } from '@qwery/extensions-sdk';
import type { NormalizedSchema, SchemaVersion } from '@qwery/domain/entities';

export class SchemaVersionExtractor {
  constructor(private driver: DatasourceDriver) {}

  /**
   * Get current schema version from schema_migrations table
   * Returns null if no migrations exist (first time)
   */
  async getCurrentVersion(datasourceId: string): Promise<number | null> {
    try {
      const result = await this.driver.query(`
        SELECT MAX(version) as max_version 
        FROM schema_migrations 
        WHERE datasource_id = ?
      `, [datasourceId]);

      const maxVersion = result.rows[0]?.max_version;
      return maxVersion != null ? Number(maxVersion) : null;
    } catch (error) {
      // Table doesn't exist yet (first migration)
      if (error.message?.includes('no such table')) {
        await this.initializeVersionTable();
        return null;
      }
      throw error;
    }
  }

  /**
   * Compute hash of normalized schema for versioning
   */
  computeSchemaHash(normalizedSchema: NormalizedSchema): string {
    const schemaJson = JSON.stringify(normalizedSchema, null, 0); // No formatting for consistent hash
    return createHash('sha256').update(schemaJson).digest('hex');
  }

  /**
   * Check if schema hash already exists (same schema, different version)
   */
  async findVersionByHash(datasourceId: string, schemaHash: string): Promise<number | null> {
    const result = await this.driver.query(`
      SELECT version 
      FROM schema_migrations 
      WHERE datasource_id = ? AND schema_hash = ?
      ORDER BY version DESC
      LIMIT 1
    `, [datasourceId, schemaHash]);

    return result.rows[0]?.version ? Number(result.rows[0].version) : null;
  }

  /**
   * Record new schema version
   */
  async recordVersion(version: SchemaVersion): Promise<void> {
    await this.driver.query(`
      INSERT INTO schema_migrations 
      (datasource_id, version, schema_hash, schema_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      version.datasourceId,
      version.version,
      version.schemaHash,
      JSON.stringify(version.normalizedSchema),
      version.createdAt.toISOString()
    ]);
  }

  /**
   * Get schema by version (for rollback/history)
   */
  async getSchemaByVersion(datasourceId: string, version: number): Promise<NormalizedSchema | null> {
    const result = await this.driver.query(`
      SELECT schema_json 
      FROM schema_migrations 
      WHERE datasource_id = ? AND version = ?
    `, [datasourceId, version]);

    if (!result.rows[0]) {
      return null;
    }

    return JSON.parse(result.rows[0].schema_json) as NormalizedSchema;
  }

  /**
   * Initialize version table if it doesn't exist
   */
  private async initializeVersionTable(): Promise<void> {
    await this.driver.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        datasource_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        schema_hash TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(datasource_id, version)
      )
    `);

    await this.driver.query(`
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_datasource 
      ON schema_migrations(datasource_id)
    `);

    await this.driver.query(`
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
      ON schema_migrations(datasource_id, version DESC)
    `);
  }
}
```

### Schema Normalizer (Updated)

```typescript
// packages/agent-factory-sdk/src/services/schema-extraction/schema-normalizer.ts

import type { NormalizedSchema, SQLNormalizedSchema, NoSQLNormalizedSchema } from '@qwery/domain/entities';

export class SchemaNormalizer {
  /**
   * Normalize provider schema to standard format
   */
  async normalize(
    providerSchema: unknown,
    providerType: string,
    isNoSQL: boolean = false
  ): Promise<NormalizedSchema> {
    if (isNoSQL) {
      return {
        type: 'nosql',
        schema: await this.normalizeNoSQL(providerSchema, providerType),
      };
    } else {
      return {
        type: 'sql',
        schema: await this.normalizeSQL(providerSchema, providerType),
      };
    }
  }

  private async normalizeSQL(
    providerSchema: unknown,
    providerType: string
  ): Promise<SQLNormalizedSchema> {
    // Convert provider-specific format to SQLNormalizedSchema
    // Implementation depends on provider type
    
    // Example for PostgreSQL:
    if (providerType === 'postgresql' || providerType === 'pglite') {
      return this.normalizePostgreSQL(providerSchema);
    }
    
    // Example for DuckDB:
    if (providerType === 'duckdb') {
      return this.normalizeDuckDB(providerSchema);
    }
    
    throw new Error(`Unsupported SQL provider: ${providerType}`);
  }

  private async normalizeNoSQL(
    providerSchema: unknown,
    providerType: string
  ): Promise<NoSQLNormalizedSchema> {
    // Convert provider-specific format to NoSQLNormalizedSchema
    
    if (providerType === 'mongodb') {
      return this.normalizeMongoDB(providerSchema);
    }
    
    throw new Error(`Unsupported NoSQL provider: ${providerType}`);
  }

  /**
   * Map provider types to standard types
   */
  private mapColumnType(providerType: string, provider: string): 'string' | 'integer' | 'boolean' | 'float' | 'datetime' | 'json' | 'binary' {
    const typeLower = providerType.toLowerCase();
    
    // String types
    if (typeLower.includes('varchar') || typeLower.includes('char') || typeLower.includes('text')) {
      return 'string';
    }
    
    // Integer types
    if (typeLower.includes('int') && !typeLower.includes('float')) {
      return 'integer';
    }
    
    // Float types
    if (typeLower.includes('float') || typeLower.includes('double') || typeLower.includes('decimal') || typeLower.includes('numeric')) {
      return 'float';
    }
    
    // Boolean types
    if (typeLower.includes('bool')) {
      return 'boolean';
    }
    
    // DateTime types
    if (typeLower.includes('timestamp') || typeLower.includes('date') || typeLower.includes('time')) {
      return 'datetime';
    }
    
    // JSON types
    if (typeLower.includes('json') || typeLower.includes('jsonb')) {
      return 'json';
    }
    
    // Binary types
    if (typeLower.includes('binary') || typeLower.includes('blob') || typeLower.includes('bytea')) {
      return 'binary';
    }
    
    // Default to string for unknown types
    return 'string';
  }

  // Implementation methods for each provider...
  private normalizePostgreSQL(schema: unknown): SQLNormalizedSchema {
    // Parse PostgreSQL information_schema format
    // Extract tables, columns, indexes, foreign keys
    // Map to SQLNormalizedSchema format
    // ...
  }

  private normalizeDuckDB(schema: unknown): SQLNormalizedSchema {
    // Parse DuckDB schema format
    // ...
  }

  private normalizeMongoDB(schema: unknown): NoSQLNormalizedSchema {
    // Parse MongoDB collection structure
    // ...
  }
}
```

### Cache with Version Tracking

```typescript
// packages/agent-factory-sdk/src/services/schema-cache/schema-cache.service.ts

export interface SchemaCacheEntry {
  datasourceId: string;
  version: number;
  schemaHash: string;
  normalizedSchema: NormalizedSchema;
  cachedAt: Date;
  expiresAt: Date;
}

export class SchemaCacheService implements ISchemaCache {
  private l1Cache = new Map<string, SchemaCacheEntry>(); // Key: datasourceId
  private readonly TTL_L1 = 5 * 60 * 1000; // 5 minutes
  private readonly TTL_L2 = 60 * 60 * 1000; // 1 hour

  async get(datasourceId: string, version?: number): Promise<SchemaCacheEntry | null> {
    // Check L1 cache first
    const l1Key = datasourceId;
    const l1Entry = this.l1Cache.get(l1Key);
    
    if (l1Entry && l1Entry.expiresAt > new Date()) {
      // If version specified, verify it matches
      if (version === undefined || l1Entry.version === version) {
        return l1Entry;
      }
    }

    // Check L2 cache (IndexedDB)
    const l2Entry = await this.getFromL2(datasourceId, version);
    if (l2Entry) {
      // Promote to L1
      this.l1Cache.set(l1Key, l2Entry);
      return l2Entry;
    }

    return null;
  }

  async set(entry: SchemaCacheEntry): Promise<void> {
    // Store in L1
    this.l1Cache.set(entry.datasourceId, entry);
    
    // Store in L2 (IndexedDB)
    await this.setInL2(entry);
  }

  /**
   * Instant version check - just compares version numbers
   */
  async checkVersion(datasourceId: string, currentVersion: number): Promise<boolean> {
    const cached = await this.get(datasourceId);
    return cached?.version === currentVersion;
  }
}
```

## Usage Flow

1. **User Query**: "Show me users from my PostgreSQL database"
2. **Resolve Datasource**: Look up datasource ID from project context
3. **Get Current Version**: Query `SELECT MAX(version) FROM schema_migrations WHERE datasource_id = ?` → Returns `5`
4. **Check Cache Version**: Get cached schema for datasource → Cached version = `5`
5. **Version Match**: `5 === 5` → **Instant cache hit** (< 1ms)
6. **Use Cached Schema**: Generate SQL with cached normalized schema

If version differs:
1. **Get Current Version**: Returns `6` (schema changed)
2. **Check Cache Version**: Cached version = `5`
3. **Version Mismatch**: `5 !== 6` → Extract fresh schema
4. **Extract & Normalize**: Get schema, normalize to standard format
5. **Compute Hash**: Generate SHA256 hash of normalized schema
6. **Check Hash**: See if hash exists (same schema, different version number)
7. **Record Version**: Insert version `6` into `schema_migrations`
8. **Cache**: Store with version `6`

## Benefits

- **Instant Freshness Checks**: Version comparison is O(1) integer comparison
- **Exact State Tracking**: Every schema change increments version
- **Rollback Support**: Can query any previous schema version
- **Consistency**: Same schema = same hash, even if version numbers differ
- **Multi-Datasource**: Each datasource has independent version tracking
- **Migration History**: Full audit trail of schema changes


