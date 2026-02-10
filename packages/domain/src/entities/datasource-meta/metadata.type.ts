import { z } from 'zod';

import { ColumnArrayZodSchema } from './columns.type';
import { ColumnPrivilegesArrayZodSchema } from './column-privileges.type';
import { ConfigArrayZodSchema } from './config.type';
import { DatasourceExtensionArrayZod } from './extensions.type';
import { ForeignTableArrayZodSchema } from './foreign-tables.type';
import { FunctionArrayZodSchema } from './functions.type';
import { IndexArrayZodSchema } from './indexes.type';
import { MaterializedViewArrayZodSchema } from './materialized-views.type';
import { PolicyArrayZodSchema } from './policies.type';
import { PublicationArrayZodSchema } from './publications.type';
import { RoleArrayZodSchema } from './roles.type';
import { SchemaArrayZod } from './schema.type';
import { TableArrayZodSchema } from './tables.type';
import { TablePrivilegesArrayZodSchema } from './table-privileges.type';
import { TriggerArrayZodSchema } from './triggers.type';
import { TypeArrayZodSchema } from './types.type';
import { ViewArrayZodSchema } from './views.type';

export const DatasourceMetadataZodSchema = z
  .object({
    version: z.string(),
    driver: z.string(),
    schemas: SchemaArrayZod,
    tables: TableArrayZodSchema,
    columns: ColumnArrayZodSchema,
    views: ViewArrayZodSchema.optional(),
    functions: FunctionArrayZodSchema.optional(),
    indexes: IndexArrayZodSchema.optional(),
    triggers: TriggerArrayZodSchema.optional(),
    materializedViews: MaterializedViewArrayZodSchema.optional(),
    types: TypeArrayZodSchema.optional(),
    foreignTables: ForeignTableArrayZodSchema.optional(),
    // Optional capabilities
    policies: PolicyArrayZodSchema.optional(),
    tablePrivileges: TablePrivilegesArrayZodSchema.optional(),
    columnPrivileges: ColumnPrivilegesArrayZodSchema.optional(),
    // Optional vendor/deployment components
    config: ConfigArrayZodSchema.optional(),
    publications: PublicationArrayZodSchema.optional(),
    roles: RoleArrayZodSchema.optional(),
    extensions: DatasourceExtensionArrayZod.optional(),
  })
  .passthrough();

export type DatasourceMetadata = z.infer<typeof DatasourceMetadataZodSchema>;
