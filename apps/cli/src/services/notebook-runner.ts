import type { Datasource } from '@qwery/domain/entities';
import { createDriverForDatasource } from '../extensions/driver-factory';
import { CliUsageError } from '../utils/errors';
import type { TelemetryManager } from '@qwery/telemetry-opentelemetry';

export interface RunCellOptions {
  datasource: Datasource;
  query: string;
  mode: 'sql' | 'natural';
}

export interface RunCellResult {
  sql: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

export class NotebookRunner {
  constructor(private readonly telemetry?: TelemetryManager) {}

  public async testConnection(datasource: Datasource): Promise<void> {
    const driver = await createDriverForDatasource(datasource);
    try {
      await driver.testConnection(datasource.config ?? {});
    } finally {
      await driver.close?.();
    }
  }

  public async runCell(options: RunCellOptions): Promise<RunCellResult> {
    // If SQL mode, execute directly
    if (options.mode === 'sql') {
      const driver = await createDriverForDatasource(options.datasource);
      try {
        const result = await driver.query(
          options.query,
          options.datasource.config ?? {},
        );
        const rowCount =
          result.stat?.rowsRead ??
          result.stat?.rowsAffected ??
          result.rows.length;
        return { sql: options.query, rows: result.rows, rowCount };
      } finally {
        await driver.close?.();
      }
    }

    // For natural language mode, throw error (not yet implemented)
    throw new CliUsageError('Natural language mode is not yet available');
  }
}
