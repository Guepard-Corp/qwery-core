import { UseCase } from '../usecase';
import type { DatasourceMetadata, SimpleSchema } from '../../entities';

export interface TransformMetadataToSimpleSchemaInput {
  metadata: DatasourceMetadata;
  datasourceDatabaseMap: Map<string, string>;
}

export type TransformMetadataToSimpleSchemaUseCase = UseCase<
  TransformMetadataToSimpleSchemaInput,
  Map<string, SimpleSchema>
>;
