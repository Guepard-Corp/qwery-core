import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  unlinkSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock CSV content
const mockCsvContent = `name,age,city
John Doe,30,New York
Jane Smith,25,San Francisco
Bob Johnson,35,Chicago`;

describe('gsheetToDuckdb', () => {
  let testWorkspace: string;
  let dbPath: string;
  let csvFilePath: string;

  beforeEach(() => {
    testWorkspace = join(
      tmpdir(),
      `test-workspace-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    dbPath = join(testWorkspace, 'test-conversation', 'database.db');
    csvFilePath = join(testWorkspace, 'test.csv');

    // Ensure directory exists
    mkdirSync(testWorkspace, { recursive: true });

    // Create a local CSV file for testing (since DuckDB uses its own HTTP client)
    writeFileSync(csvFilePath, mockCsvContent);
  });

  afterEach(() => {
    // Clean up test database files
    try {
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
      if (existsSync(csvFilePath)) {
        unlinkSync(csvFilePath);
      }
      // Clean up workspace directory
      try {
        rmdirSync(join(testWorkspace, 'test-conversation'));
        rmdirSync(testWorkspace);
      } catch {
        // Ignore errors
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create DuckDB view from Google Sheet link', async () => {
    const { gsheetToDuckdb } = await import('../../src/tools/gsheet-to-duckdb');
    // Use local CSV file path instead of URL for testing
    const sharedLink = csvFilePath;

    const result = await gsheetToDuckdb({
      dbPath,
      sharedLink,
    });

    expect(result).toContain("Successfully created view 'my_sheet'");
    expect(result).toContain('database.db');

    // Verify database file was created
    expect(existsSync(dbPath)).toBe(true);

    // Verify view exists by querying it
    const { DuckDBInstance } = await import('@duckdb/node-api');
    const instance = await DuckDBInstance.create(dbPath);
    const conn = await instance.connect();

    try {
      const resultReader = await conn.runAndReadAll(
        'SELECT * FROM my_sheet LIMIT 1',
      );
      await resultReader.readAll();
      const rows = resultReader.getRowObjectsJS();
      expect(rows.length).toBeGreaterThan(0);
      // Verify CSV data was loaded
      expect(rows[0]).toHaveProperty('name');
      expect(rows[0]).toHaveProperty('age');
      expect(rows[0]).toHaveProperty('city');
    } finally {
      conn.closeSync();
      instance.closeSync();
    }
  });

  it('should handle non-Google Sheets links', async () => {
    const { gsheetToDuckdb } = await import('../../src/tools/gsheet-to-duckdb');
    // Use local CSV file path
    const sharedLink = csvFilePath;

    const result = await gsheetToDuckdb({
      dbPath,
      sharedLink,
    });

    expect(result).toContain("Successfully created view 'my_sheet'");
  });

  it('should create directories if they do not exist', async () => {
    const { gsheetToDuckdb } = await import('../../src/tools/gsheet-to-duckdb');
    const newDbPath = join(testWorkspace, 'new-conversation', 'database.db');

    await gsheetToDuckdb({
      dbPath: newDbPath,
      sharedLink: csvFilePath,
    });

    expect(existsSync(newDbPath)).toBe(true);

    // Cleanup
    try {
      unlinkSync(newDbPath);
      rmdirSync(join(testWorkspace, 'new-conversation'));
    } catch {
      // Ignore cleanup errors
    }
  });
});
