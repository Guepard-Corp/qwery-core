import { PGlite } from '@electric-sql/pglite';

import { DatasourceDriver, DatasourceResultSet } from '@qwery/extensions-sdk';

export class PGliteDriver extends DatasourceDriver {
  private db: PGlite | null = null;

  constructor(name: string, config: Record<string, unknown> | string) {
    super(name, config);
  }

  async getCurrentSchema(): Promise<string | null> {
    // PostgreSQL default schema
    return 'public';
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) {
        const tempDb = new PGlite(`idb://${this.name}`);
        await tempDb.waitReady;
        await tempDb.close();
      }
      return true;
    } catch (error) {
      console.error('PGlite connection test failed:', error);
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = new PGlite(`idb://${this.name}`);
    await this.db.waitReady;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async query(query: string): Promise<DatasourceResultSet> {
    if (!this.db) {
      await this.connect();
    }

    const startTime = performance.now();

    try {
      const result = await this.db!.query(query);
      const endTime = performance.now();

      // Transform PGlite result to DatasourceResultSet format
      const headers = result.fields.map((field) => ({
        name: field.name,
        displayName: field.name,
        originalType: field.dataTypeID?.toString() ?? null,
        originalName: field.name,
      }));

      const rows = result.rows.map((row) => {
        if (Array.isArray(row)) {
          // Handle array-based rows
          const rowData: Record<string, unknown> = {};
          result.fields.forEach((field, index) => {
            rowData[field.name] = row[index];
          });
          return rowData;
        } else {
          // Handle object-based rows (already in correct format)
          return row as Record<string, unknown>;
        }
      });

      return {
        rows,
        headers,
        stat: {
          rowsAffected: result.affectedRows ?? 0,
          rowsRead: rows.length,
          rowsWritten: result.affectedRows ?? 0,
          queryDurationMs: endTime - startTime,
        },
      };
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
