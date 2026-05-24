// Re-export the canonical datasource metadata + result types from the domain so
// extension authors import everything from the SDK and stay aligned with
// `@qwery/domain` `datasource-meta`.
export {
  type ColumnHeader,
  ColumnHeaderSchema,
  type DatasourceMetadata,
  DatasourceMetadataZodSchema,
  type DatasourceResultSet,
  DatasourceResultSetZodSchema,
} from '@qwery/domain';
