import { describe, expect, it } from 'vitest';
import type { DatasourceMetadata } from '../../../src/entities';
import { TransformMetadataToSimpleSchemaService } from '../../../src/services/datasources/transform-metadata-to-simple-schema.service';

describe('TransformMetadataToSimpleSchemaService', () => {
  const service = new TransformMetadataToSimpleSchemaService();

  it('should transform metadata with main database tables', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [{ id: 1, name: 'main', owner: 'unknown' }],
      tables: [
        {
          id: 1,
          schema: 'main',
          name: 'users',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [
        {
          id: 'main.users.id',
          table_id: 1,
          schema: 'main',
          table: 'users',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
        {
          id: 'main.users.name',
          table_id: 1,
          schema: 'main',
          table: 'users',
          name: 'name',
          ordinal_position: 2,
          data_type: 'VARCHAR',
          format: 'VARCHAR',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: true,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
      ],
    };

    const datasourceDatabaseMap = new Map<string, string>();
    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(1);
    const schema = result.get('main.main');
    expect(schema).toBeDefined();
    expect(schema?.databaseName).toBe('main');
    expect(schema?.schemaName).toBe('main');
    expect(schema?.tables).toHaveLength(1);
    expect(schema?.tables[0]?.tableName).toBe('users');
    expect(schema?.tables[0]?.columns).toHaveLength(2);
    expect(schema?.tables[0]?.columns[0]?.columnName).toBe('id');
    expect(schema?.tables[0]?.columns[0]?.columnType).toBe('INTEGER');
    expect(schema?.tables[0]?.columns[1]?.columnName).toBe('name');
    expect(schema?.tables[0]?.columns[1]?.columnType).toBe('VARCHAR');
  });

  it('should transform metadata with attached database tables', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [{ id: 1, name: 'public', owner: 'unknown' }],
      tables: [
        {
          id: 1,
          schema: 'public',
          name: 'products',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [
        {
          id: 'public.products.id',
          table_id: 1,
          schema: 'public',
          table: 'products',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
        {
          id: 'public.products.title',
          table_id: 1,
          schema: 'public',
          table: 'products',
          name: 'title',
          ordinal_position: 2,
          data_type: 'VARCHAR',
          format: 'VARCHAR',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: true,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
      ],
    };

    // Map datasource ID to database name (schema matches database name)
    const datasourceDatabaseMap = new Map<string, string>();
    datasourceDatabaseMap.set('ds-1', 'public');

    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(1);
    const schema = result.get('public.public');
    expect(schema).toBeDefined();
    expect(schema?.databaseName).toBe('public');
    expect(schema?.schemaName).toBe('public');
    expect(schema?.tables).toHaveLength(1);
    // Attached database tables should have formatted names
    expect(schema?.tables[0]?.tableName).toBe('public.public.products');
    expect(schema?.tables[0]?.columns).toHaveLength(2);
  });

  it('should handle multiple schemas from different databases', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [
        { id: 1, name: 'main', owner: 'unknown' },
        { id: 2, name: 'public', owner: 'unknown' },
      ],
      tables: [
        {
          id: 1,
          schema: 'main',
          name: 'local_table',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
        {
          id: 2,
          schema: 'public',
          name: 'remote_table',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [
        {
          id: 'main.local_table.id',
          table_id: 1,
          schema: 'main',
          table: 'local_table',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
        {
          id: 'public.remote_table.id',
          table_id: 2,
          schema: 'public',
          table: 'remote_table',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
      ],
    };

    const datasourceDatabaseMap = new Map<string, string>();
    datasourceDatabaseMap.set('ds-1', 'public');

    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(2);

    // Main database schema
    const mainSchema = result.get('main.main');
    expect(mainSchema).toBeDefined();
    expect(mainSchema?.databaseName).toBe('main');
    expect(mainSchema?.tables[0]?.tableName).toBe('local_table'); // Not formatted

    // Attached database schema
    const publicSchema = result.get('public.public');
    expect(publicSchema).toBeDefined();
    expect(publicSchema?.databaseName).toBe('public');
    expect(publicSchema?.tables[0]?.tableName).toBe(
      'public.public.remote_table',
    ); // Formatted
  });

  it('should sort columns by ordinal_position', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [{ id: 1, name: 'main', owner: 'unknown' }],
      tables: [
        {
          id: 1,
          schema: 'main',
          name: 'users',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [
        {
          id: 'main.users.email',
          table_id: 1,
          schema: 'main',
          table: 'users',
          name: 'email',
          ordinal_position: 3,
          data_type: 'VARCHAR',
          format: 'VARCHAR',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: true,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
        {
          id: 'main.users.id',
          table_id: 1,
          schema: 'main',
          table: 'users',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
        {
          id: 'main.users.name',
          table_id: 1,
          schema: 'main',
          table: 'users',
          name: 'name',
          ordinal_position: 2,
          data_type: 'VARCHAR',
          format: 'VARCHAR',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: true,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
      ],
    };

    const datasourceDatabaseMap = new Map<string, string>();
    const result = await service.execute({ metadata, datasourceDatabaseMap });

    const schema = result.get('main.main');
    expect(schema?.tables[0]?.columns).toHaveLength(3);
    // Columns should be sorted by ordinal_position
    expect(schema?.tables[0]?.columns[0]?.columnName).toBe('id');
    expect(schema?.tables[0]?.columns[1]?.columnName).toBe('name');
    expect(schema?.tables[0]?.columns[2]?.columnName).toBe('email');
  });

  it('should handle empty metadata', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [],
      tables: [],
      columns: [],
    };

    const datasourceDatabaseMap = new Map<string, string>();
    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(0);
  });

  it('should handle tables without columns', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [{ id: 1, name: 'main', owner: 'unknown' }],
      tables: [
        {
          id: 1,
          schema: 'main',
          name: 'empty_table',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [],
    };

    const datasourceDatabaseMap = new Map<string, string>();
    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(1);
    const schema = result.get('main.main');
    expect(schema?.tables).toHaveLength(1);
    expect(schema?.tables[0]?.columns).toHaveLength(0);
  });

  it('should handle schema name matching database name for attached databases', async () => {
    const metadata: DatasourceMetadata = {
      version: '0.0.1',
      driver: 'duckdb',
      schemas: [{ id: 1, name: 'postgres_db', owner: 'unknown' }],
      tables: [
        {
          id: 1,
          schema: 'postgres_db',
          name: 'customers',
          rls_enabled: false,
          rls_forced: false,
          bytes: 0,
          size: '0',
          live_rows_estimate: 0,
          dead_rows_estimate: 0,
          comment: null,
          primary_keys: [],
          relationships: [],
        },
      ],
      columns: [
        {
          id: 'postgres_db.customers.id',
          table_id: 1,
          schema: 'postgres_db',
          table: 'customers',
          name: 'id',
          ordinal_position: 1,
          data_type: 'INTEGER',
          format: 'INTEGER',
          is_identity: false,
          identity_generation: null,
          is_generated: false,
          is_nullable: false,
          is_updatable: true,
          is_unique: false,
          check: null,
          default_value: null,
          enums: [],
          comment: null,
        },
      ],
    };

    // Schema name matches database name
    const datasourceDatabaseMap = new Map<string, string>();
    datasourceDatabaseMap.set('ds-1', 'postgres_db');

    const result = await service.execute({ metadata, datasourceDatabaseMap });

    expect(result.size).toBe(1);
    const schema = result.get('postgres_db.postgres_db');
    expect(schema).toBeDefined();
    expect(schema?.databaseName).toBe('postgres_db');
    expect(schema?.tables[0]?.tableName).toBe(
      'postgres_db.postgres_db.customers',
    );
  });
});
