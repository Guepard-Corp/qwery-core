import { z } from 'zod';
import { ColumnArrayZodSchema } from './columns.type';

const TablePrimaryKeyZodSchema = z.object({
  table_id: z.number(),
  name: z.string(),
  schema: z.string(),
  table_name: z.string(),
});

const TableRelationshipZodSchema = z.object({
  id: z.number(),
  constraint_name: z.string(),
  source_schema: z.string(),
  source_table_name: z.string(),
  source_column_name: z.string(),
  target_table_schema: z.string(),
  target_table_name: z.string(),
  target_column_name: z.string(),
});

const TableZodSchema = z
  .object({
    id: z.number(),
    schema: z.string(),
    name: z.string(),
    rls_enabled: z.boolean(),
    rls_forced: z.boolean(),
    bytes: z.number(),
    size: z.string(),
    live_rows_estimate: z.number(),
    dead_rows_estimate: z.number(),
    comment: z.string().nullable(),
    primary_keys: z.array(TablePrimaryKeyZodSchema),
    relationships: z.array(TableRelationshipZodSchema),
    columns: ColumnArrayZodSchema.optional(),
  })
  .passthrough();

export const TableArrayZodSchema = z.array(TableZodSchema);

export type Table = z.infer<typeof TableZodSchema>;
