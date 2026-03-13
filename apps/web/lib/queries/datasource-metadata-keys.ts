export const DATASOURCE_METADATA_QUERY_KEY = 'datasource-metadata' as const;

export type DatasourceMetadataKey = readonly [
  typeof DATASOURCE_METADATA_QUERY_KEY,
  string,
  string,
  string | undefined,
];

export const datasourceMetadataKeys = {
  detail(
    datasourceProvider: string,
    driverId: string,
    datasourceId?: string,
  ): DatasourceMetadataKey {
    return [
      DATASOURCE_METADATA_QUERY_KEY,
      datasourceProvider,
      driverId,
      datasourceId,
    ];
  },
  isDetailOf(
    queryKey: readonly unknown[],
    datasourceId: string,
  ): queryKey is DatasourceMetadataKey {
    return (
      queryKey[0] === DATASOURCE_METADATA_QUERY_KEY &&
      queryKey[3] === datasourceId
    );
  },
};
