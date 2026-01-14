import type { IDataSourceDriver } from '@qwery/extensions-sdk';

import type { PlaygroundDatabase } from '../playground-database';
import {
  PLAYGROUND_TABLES,
  getTableCountQuery,
} from '../../utils/playground-sql';

export class PGlitePlayground implements PlaygroundDatabase {
  getConnectionConfig(projectId?: string): Record<string, unknown> {
    const dbName = projectId ? `playground-${projectId}` : 'playground';
    return {
      database: dbName,
    };
  }

  async seed(
    driver: IDataSourceDriver,
    config: Record<string, unknown>,
  ): Promise<void> {
    for (const table of PLAYGROUND_TABLES) {
      await driver.query(table.createTable, config);

      const countResult = await driver.query(
        getTableCountQuery(table.name),
        config,
      );
      const count =
        (countResult.rows[0] as { count: number | string })?.count ?? 0;
      const countNum =
        typeof count === 'string' ? parseInt(count, 10) : count;

      if (countNum === 0) {
        await driver.query(table.insertData, config);
      }
    }
  }
}
