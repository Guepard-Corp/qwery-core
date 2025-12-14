import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDBQueryEngine } from '../../src/services/duckdb-query-engine.service';
import { createQueryEngine } from '@qwery/domain/ports';
import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

describe('DuckDBQueryEngine', () => {
  describe('file:// protocol', () => {
    let testWorkspace: string;
    let engine: DuckDBQueryEngine;

    beforeEach(async () => {
      // Create temporary workspace directory
      testWorkspace = join(
        tmpdir(),
        `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      );
      mkdirSync(testWorkspace, { recursive: true });

      // Create engine instance
      engine = createQueryEngine(DuckDBQueryEngine);

      // Initialize with file:// workingDir
      const workingDir = `file://${testWorkspace}`;
      await engine.initialize({
        workingDir,
        config: {},
      });
    });

    afterEach(async () => {
      // Close engine
      try {
        await engine.close();
      } catch (error) {
        console.warn('Error closing engine:', error);
      }

      // Clean up test directory
      try {
        if (existsSync(testWorkspace)) {
          rmSync(testWorkspace, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn('Error cleaning up test workspace:', error);
      }
    });

    it('should initialize with file:// protocol', async () => {
      const dbResult = await engine.query(
        'SELECT name FROM pragma_database_list',
      );
      expect(dbResult).toBeDefined();
      expect(dbResult.rows.length).toBeGreaterThan(0);

      const dbNames = dbResult.rows.map((row) => row.name as string);
      expect(dbNames).toContain('memory'); // In-memory default database

      // Test that we can query the attached database
      const result = await engine.query('SELECT 1 as test_value');
      expect(result).toBeDefined();
      expect(result.columns.map((c) => c.name)).toContain('test_value');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.test_value).toBe(1);
    });
  });

  describe('s3:// protocol with MinIO', () => {
    let s3Config: {
      endpoint: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
    } | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let minioContainer: any = null;
    let s3Client: S3Client | null = null;

    beforeAll(async () => {
      try {
        // Setup MinIO container
        const { GenericContainer } = await import('testcontainers');

        minioContainer = await new GenericContainer('minio/minio:latest')
          .withExposedPorts(9000, 9001)
          .withCommand(['server', '/data', '--console-address', ':9001'])
          .withEnvironment({
            MINIO_ROOT_USER: 'minioadmin',
            MINIO_ROOT_PASSWORD: 'minioadmin',
          })
          .start();

        const host = minioContainer.getHost();
        const port = minioContainer.getMappedPort(9000);
        const endpoint = `http://${host}:${port}`;
        const accessKey = 'minioadmin';
        const secretKey = 'minioadmin';
        const bucket = 'test-bucket';

        // Create S3 client
        s3Client = new S3Client({
          endpoint,
          region: 'us-east-1',
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          forcePathStyle: true, // Required for MinIO
        });

        // Create bucket
        await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));

        s3Config = {
          endpoint,
          accessKey,
          secretKey,
          bucket,
        };
      } catch (error) {
        console.warn(
          'MinIO container setup failed. Skipping S3 tests. Error:',
          error,
        );
        s3Config = null;
      }
    }, 120000); // 2 minutes timeout for container startup

    afterAll(async () => {
      if (minioContainer) {
        try {
          await minioContainer.stop();
        } catch (error) {
          console.warn('Failed to cleanup MinIO container:', error);
        }
      }
      s3Client = null;
    }, 30000);

    it('should initialize with s3:// protocol and attach main.duckdb from S3', async () => {
      if (!s3Config) {
        // Skip test if MinIO container is not available
        return;
      }

      // Create engine instance
      const engine = createQueryEngine(DuckDBQueryEngine);

      // Construct S3 URI: s3://bucket/path
      const workingDir = `s3://${s3Config.bucket}/test-db`;

      // Initialize with S3 workingDir and S3 configuration
      // The engine will handle creating/attaching the database
      await engine.initialize({
        workingDir,
        config: {
          s3_endpoint: s3Config.endpoint,
          s3_region: 'us-east-1',
          s3_use_ssl: 'false',
          s3_url_style: 'path',
          s3_access_key_id: s3Config.accessKey,
          s3_secret_access_key: s3Config.secretKey,
        },
      });

      try {
        // List databases and verify master is attached
        const dbResult = await engine.query(
          'SELECT name FROM pragma_database_list',
        );
        expect(dbResult).toBeDefined();
        expect(dbResult.rows.length).toBeGreaterThan(0);

        const dbNames = dbResult.rows.map(
          (row: { name: string }) => row.name as string,
        );
        expect(dbNames).toContain('memory'); // In-memory transient database

        // Test that we can query the attached database
        const result = await engine.query('SELECT 1 as test_value');
        expect(result).toBeDefined();
        expect(result.columns.map((c) => c.name)).toContain('test_value');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.test_value).toBe(1);
      } finally {
        await engine.close();
      }
    });

    describe('PostgreSQL attachment with S3 workspace', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let postgresContainer: any = null;
      let postgresConnectionUrl: string | null = null;

      beforeAll(async () => {
        try {
          const { GenericContainer } = await import('testcontainers');

          postgresContainer = await new GenericContainer('postgres:15-alpine')
            .withExposedPorts(5432)
            .withEnvironment({
              POSTGRES_USER: 'testuser',
              POSTGRES_PASSWORD: 'testpass',
              POSTGRES_DB: 'testdb',
            })
            .start();

          const host = postgresContainer.getHost();
          const port = postgresContainer.getMappedPort(5432);
          postgresConnectionUrl = `postgresql://testuser:testpass@${host}:${port}/testdb`;

          // Create a test table with data using exec
          await postgresContainer.exec([
            'sh',
            '-c',
            'PGPASSWORD=testpass psql -U testuser -d testdb -c "CREATE TABLE test_users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100));"',
          ]);
          await postgresContainer.exec([
            'sh',
            '-c',
            "PGPASSWORD=testpass psql -U testuser -d testdb -c \"INSERT INTO test_users (name, email) VALUES ('Alice', 'alice@example.com'), ('Bob', 'bob@example.com');\"",
          ]);
        } catch (error) {
          console.warn(
            'PostgreSQL container setup failed. Skipping PostgreSQL tests. Error:',
            error,
          );
          postgresConnectionUrl = null;
        }
      }, 120000);

      afterAll(async () => {
        if (postgresContainer) {
          try {
            await postgresContainer.stop();
          } catch (error) {
            console.warn('Failed to cleanup PostgreSQL container:', error);
          }
        }
      }, 30000);

      it('should attach PostgreSQL database and query it using S3 workspace', async () => {
        if (!s3Config || !postgresConnectionUrl) {
          // Skip test if MinIO or PostgreSQL container is not available
          return;
        }

        const engine = createQueryEngine(DuckDBQueryEngine);

        try {
          // Construct S3 URI: s3://bucket/path
          const workingDir = `s3://${s3Config.bucket}/postgres-test-db`;

          // Initialize engine with S3 workingDir
          // DuckDB's s3_endpoint should not include the protocol (http:// or https://)
          const s3Endpoint = s3Config.endpoint.replace(/^https?:\/\//, '');
          await engine.initialize({
            workingDir,
            config: {
              s3_endpoint: s3Endpoint,
              s3_region: 'us-east-1',
              s3_use_ssl: 'false',
              s3_url_style: 'path',
              s3_access_key_id: s3Config.accessKey,
              s3_secret_access_key: s3Config.secretKey,
            },
          });

          // Create PostgreSQL datasource
          const postgresDatasource: Datasource = {
            id: 'test-postgres-ds',
            projectId: 'test-project',
            name: 'Test PostgreSQL',
            description: 'Test PostgreSQL database',
            slug: 'test-postgres',
            datasource_provider: 'postgresql',
            datasource_driver: 'postgresql',
            datasource_kind: DatasourceKind.REMOTE,
            config: {
              connectionUrl: postgresConnectionUrl,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isPublic: false,
          };

          // Create and upload a CSV file to MinIO for federated query
          const csvContent = `name,department,salary
Alice,Engineering,95000
Bob,Marketing,85000
Charlie,Sales,75000`;
          const csvKey = 'data/user_departments.csv';

          await s3Client!.send(
            new PutObjectCommand({
              Bucket: s3Config.bucket,
              Key: csvKey,
              Body: csvContent,
              ContentType: 'text/csv',
            }),
          );

          // Create CSV datasource pointing to S3
          // DuckDB will use the S3 configuration set during initialization
          const csvDatasource: Datasource = {
            id: 'test-csv-ds',
            projectId: 'test-project',
            name: 'User Departments CSV',
            description: 'CSV file with user department data',
            slug: 'user-departments-csv',
            datasource_provider: 'csv',
            datasource_driver: 'csv',
            datasource_kind: DatasourceKind.EMBEDDED,
            config: {
              path: `s3://${s3Config.bucket}/${csvKey}`,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isPublic: false,
          };

          // Attach both PostgreSQL and CSV datasources
          await engine.attach([postgresDatasource, csvDatasource]);

          // Connect
          await engine.connect();

          // Query the attached databases
          const dbResult = await engine.query(
            'SELECT name FROM pragma_database_list',
          );
          expect(dbResult).toBeDefined();
          expect(dbResult.rows.length).toBeGreaterThan(0);

          const dbNames = dbResult.rows.map(
            (row: { name: string }) => row.name as string,
          );
          // The attached database should be in the list (name is sanitized from datasource name)
          expect(dbNames.length).toBeGreaterThan(0);

          // Query the test_users table from PostgreSQL
          const attachedDbName = dbNames.find(
            (name: string) => name !== 'memory' && name !== 'main',
          );
          expect(attachedDbName).toBeDefined();

          const pgResult = await engine.query(
            `SELECT id, name, email FROM "${attachedDbName}".public.test_users ORDER BY id`,
          );

          expect(pgResult).toBeDefined();
          expect(pgResult.columns.map((c) => c.name)).toEqual([
            'id',
            'name',
            'email',
          ]);
          expect(pgResult.rows).toHaveLength(2);
          expect(pgResult.rows[0]?.name).toBe('Alice');
          expect(pgResult.rows[0]?.email).toBe('alice@example.com');
          expect(pgResult.rows[1]?.name).toBe('Bob');
          expect(pgResult.rows[1]?.email).toBe('bob@example.com');

          // Perform federated query joining PostgreSQL and CSV data
          // The CSV datasource creates a view, so we need to find the view name
          // Query duckdb_views() to find the view created for the CSV datasource
          const viewsResult = await engine.query(`
            SELECT view_name 
            FROM duckdb_views() 
            WHERE view_name LIKE '%test_csv_ds%'
          `);
          expect(viewsResult.rows.length).toBeGreaterThan(0);
          const csvViewName = viewsResult.rows[0]?.view_name as string;
          expect(csvViewName).toBeDefined();

          const federatedResult = await engine.query(`
            SELECT 
              pg.id,
              pg.name,
              pg.email,
              csv.department,
              csv.salary
            FROM "${attachedDbName}".public.test_users pg
            INNER JOIN "${csvViewName}" csv ON pg.name = csv.name
            ORDER BY pg.id
          `);

          expect(federatedResult).toBeDefined();
          expect(federatedResult.columns.map((c) => c.name)).toEqual([
            'id',
            'name',
            'email',
            'department',
            'salary',
          ]);
          expect(federatedResult.rows).toHaveLength(2);

          // Verify Alice's joined data
          expect(federatedResult.rows[0]?.name).toBe('Alice');
          expect(federatedResult.rows[0]?.email).toBe('alice@example.com');
          expect(federatedResult.rows[0]?.department).toBe('Engineering');
          // CSV values are read as strings by default
          expect(String(federatedResult.rows[0]?.salary)).toBe('95000');

          // Verify Bob's joined data
          expect(federatedResult.rows[1]?.name).toBe('Bob');
          expect(federatedResult.rows[1]?.email).toBe('bob@example.com');
          expect(federatedResult.rows[1]?.department).toBe('Marketing');
          // CSV values are read as strings by default
          expect(String(federatedResult.rows[1]?.salary)).toBe('85000');
        } finally {
          await engine.close();
        }
      });

      it('should extract metadata from attached PostgreSQL database', async () => {
        if (!s3Config || !postgresConnectionUrl) {
          // Skip test if MinIO or PostgreSQL container is not available
          return;
        }

        const engine = createQueryEngine(DuckDBQueryEngine);

        try {
          // Construct S3 URI: s3://bucket/path
          const workingDir = `s3://${s3Config.bucket}/postgres-metadata-test-db`;

          // Initialize engine with S3 workingDir
          await engine.initialize({
            workingDir,
            config: {
              s3_endpoint: s3Config.endpoint,
              s3_region: 'us-east-1',
              s3_use_ssl: 'false',
              s3_url_style: 'path',
              s3_access_key_id: s3Config.accessKey,
              s3_secret_access_key: s3Config.secretKey,
            },
          });

          // Create PostgreSQL datasource
          const postgresDatasource: Datasource = {
            id: 'test-postgres-ds-metadata',
            projectId: 'test-project',
            name: 'Test PostgreSQL Metadata',
            description: 'Test PostgreSQL database for metadata',
            slug: 'test-postgres-metadata',
            datasource_provider: 'postgresql',
            datasource_driver: 'postgresql',
            datasource_kind: DatasourceKind.REMOTE,
            config: {
              connectionUrl: postgresConnectionUrl,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isPublic: false,
          };

          // Attach PostgreSQL datasource
          await engine.attach([postgresDatasource]);

          // Connect
          await engine.connect();

          // Extract metadata
          const metadata = await engine.metadata([postgresDatasource]);

          // Validate metadata structure
          expect(metadata).toBeDefined();
          expect(metadata.version).toBe('0.0.1');
          expect(metadata.driver).toBe('duckdb');
          expect(metadata.schemas).toBeDefined();
          expect(Array.isArray(metadata.schemas)).toBe(true);
          expect(metadata.tables).toBeDefined();
          expect(Array.isArray(metadata.tables)).toBe(true);
          expect(metadata.columns).toBeDefined();
          expect(Array.isArray(metadata.columns)).toBe(true);

          // Find the public schema
          const publicSchema = metadata.schemas.find(
            (s: { name: string }) => s.name === 'public',
          );
          expect(publicSchema).toBeDefined();

          // Find the test_users table
          const testUsersTable = metadata.tables.find(
            (t: { name: string; schema: string }) =>
              t.name === 'test_users' && t.schema === 'public',
          );
          expect(testUsersTable).toBeDefined();
          expect(testUsersTable?.id).toBeDefined();
          expect(typeof testUsersTable?.id).toBe('number');
          expect(testUsersTable?.schema).toBe('public');
          expect(testUsersTable?.name).toBe('test_users');

          // Validate columns for test_users table
          const testUsersColumns = metadata.columns.filter(
            (c: { table: string; schema: string }) =>
              c.table === 'test_users' && c.schema === 'public',
          );
          expect(testUsersColumns.length).toBe(3);

          // Validate id column
          const idColumn = testUsersColumns.find(
            (c: { name: string }) => c.name === 'id',
          );
          expect(idColumn).toBeDefined();
          expect(idColumn?.table_id).toBe(testUsersTable?.id);
          expect(idColumn?.ordinal_position).toBe(1);
          expect(idColumn?.data_type).toBeDefined();
          expect(idColumn?.is_nullable).toBe(false); // SERIAL PRIMARY KEY is NOT NULL

          // Validate name column
          const nameColumn = testUsersColumns.find(
            (c: { name: string }) => c.name === 'name',
          );
          expect(nameColumn).toBeDefined();
          expect(nameColumn?.table_id).toBe(testUsersTable?.id);
          expect(nameColumn?.ordinal_position).toBe(2);
          expect(nameColumn?.data_type).toBeDefined();

          // Validate email column
          const emailColumn = testUsersColumns.find(
            (c: { name: string }) => c.name === 'email',
          );
          expect(emailColumn).toBeDefined();
          expect(emailColumn?.table_id).toBe(testUsersTable?.id);
          expect(emailColumn?.ordinal_position).toBe(3);
          expect(emailColumn?.data_type).toBeDefined();

          // Validate column ordering
          const sortedColumns = [...testUsersColumns].sort(
            (a, b) => a.ordinal_position - b.ordinal_position,
          );
          expect(sortedColumns[0]?.name).toBe('id');
          expect(sortedColumns[1]?.name).toBe('name');
          expect(sortedColumns[2]?.name).toBe('email');
        } finally {
          await engine.close();
        }
      });
    });
  });
});
