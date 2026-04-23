import { useQueryClient } from '@tanstack/react-query';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import {
  DatasourceExtension,
  type DriverExtension,
} from '@qwery/extensions-sdk';
import { driverCommand } from '~/lib/repositories/api-client';
import { getBrowserDriverInstance } from '~/lib/services/browser-driver';
import { resolveDriverOrThrow } from '~/lib/utils/datasource-driver';
import {
  buildDropColumnSql,
  buildDropTableSql,
  buildRenameColumnSql,
  buildRenameTableSql,
  buildTruncateTableSql,
} from '~/lib/utils/datasource-ddl-sql';
import { normalizeDatasourceConfigForProvider } from '~/lib/utils/datasource-utils';
import { datasourceMetadataKeys } from '~/lib/queries/datasource-metadata-keys';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';

export function useDatasourceDdl(datasource: Datasource | null | undefined) {
  const queryClient = useQueryClient();
  const { data: extensions = [] } = useGetDatasourceExtensions();

  const invalidateMetadata = async () => {
    if (!datasource?.id) return;
    await queryClient.invalidateQueries({
      queryKey: datasourceMetadataKeys.detail(
        datasource.datasource_provider,
        datasource.datasource_driver,
        datasource.id,
      ),
    });
  };

  const executeSql = async (sql: string): Promise<void> => {
    if (!datasource?.datasource_provider) {
      throw new Error('Datasource is required');
    }

    const dsMeta = extensions.find(
      (ext) => ext.id === datasource.datasource_provider,
    ) as DatasourceExtension | undefined;

    if (!dsMeta) {
      throw new Error('Datasource extension not found');
    }

    const driver = resolveDriverOrThrow(dsMeta, datasource);
    const runtime = driver.runtime ?? 'browser';

    if (runtime === 'browser') {
      if (datasource.datasource_kind !== DatasourceKind.EMBEDDED) {
        throw new Error('Browser drivers require embedded datasources');
      }
      const instance = await getBrowserDriverInstance(
        driver as DriverExtension,
        { config: datasource.config },
      );
      await instance.query(sql);
      await invalidateMetadata();
      return;
    }

    if (runtime === 'node') {
      await driverCommand('query', {
        datasourceProvider: datasource.datasource_provider,
        driverId: driver.id,
        config: normalizeDatasourceConfigForProvider(
          datasource.datasource_provider,
          datasource.config,
        ),
        sql,
      });
      await invalidateMetadata();
      return;
    }

    throw new Error(`Unsupported driver runtime: ${runtime}`);
  };

  const provider = datasource?.datasource_provider ?? '';

  return {
    executeSql,
    renameTable: (schema: string, tableName: string, newTableName: string) =>
      executeSql(
        buildRenameTableSql(provider, schema, tableName, newTableName),
      ),
    truncateTable: (schema: string, tableName: string) =>
      executeSql(buildTruncateTableSql(provider, schema, tableName)),
    dropTable: (schema: string, tableName: string) =>
      executeSql(buildDropTableSql(provider, schema, tableName)),
    renameColumn: (
      schema: string,
      tableName: string,
      columnName: string,
      newColumnName: string,
    ) =>
      executeSql(
        buildRenameColumnSql(
          provider,
          schema,
          tableName,
          columnName,
          newColumnName,
        ),
      ),
    dropColumn: (
      schema: string,
      tableName: string,
      columnName: string,
      options?: { cascade?: boolean },
    ) =>
      executeSql(
        buildDropColumnSql(provider, schema, tableName, columnName, options),
      ),
  };
}
