import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import { SqlAgent } from './sql-agent';
import {
  describePostgresSchema,
  runPostgresQuery,
  testPostgresConnection,
} from '../utils/postgres';

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
  private agent: SqlAgent | null = null;

  private getAgent(): SqlAgent {
    if (!this.agent) {
      this.agent = new SqlAgent();
    }
    return this.agent;
  }

  public async testConnection(datasource: Datasource): Promise<void> {
    const connectionUrl = this.getConnectionUrl(datasource);
    await testPostgresConnection(connectionUrl);
  }

  public async runCell(options: RunCellOptions): Promise<RunCellResult> {
    const connectionUrl = this.getConnectionUrl(options.datasource);
    let sql = options.query;

    if (options.mode === 'natural') {
      const schema = await describePostgresSchema(connectionUrl);
      const agent = this.getAgent();
      sql = await agent.generateSql({
        datasourceName: options.datasource.name,
        naturalLanguage: options.query,
        schemaDescription: schema,
      });
    }

    const result = await runPostgresQuery(connectionUrl, sql);
    return { sql, rows: result.rows, rowCount: result.rowCount };
  }

  private getConnectionUrl(datasource: Datasource): string {
    if (datasource.datasource_kind !== DatasourceKind.REMOTE) {
      throw new Error(
        `Datasource ${datasource.name} is not marked as REMOTE. Only remote datasources can be executed via CLI.`,
      );
    }

    const url = datasource.config?.connectionUrl;
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error(
        `Datasource ${datasource.name} is missing a connectionUrl in its config.`,
      );
    }
    return url;
  }
}

