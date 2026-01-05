import { UseCase } from '../usecase';
import type { DatasourceMetadata, SimpleSchema } from '../../entities';

export interface TransformMetadataToSimpleSchemaInput {
  metadata: DatasourceMetadata;
  datasourceDatabaseMap: Map<string, string>;
  datasourceProviderMap?: Map<string, string>; // Optional: maps datasource ID to provider (e.g., 'gsheet-csv', 'postgresql')
}

export type TransformMetadataToSimpleSchemaUseCase = UseCase<
  TransformMetadataToSimpleSchemaInput,
  Map<string, SimpleSchema>
>;
