import { z } from 'zod';
import { ColumnArrayZodSchema } from './columns.type';

export const ForeignTableZodSchema = z.object({
  id: z.number(),
  schema: z.string(),
  name: z.string(),
  comment: z.string().nullable(),
  foreign_server_name: z.string(),
  foreign_data_wrapper_name: z.string(),
  foreign_data_wrapper_handler: z.string(),
  columns: ColumnArrayZodSchema.optional(),
});

export type ForeignTable = z.infer<typeof ForeignTableZodSchema>;

export const ForeignTableArrayZodSchema = z.array(ForeignTableZodSchema);
export const ForeignTableOptionalZodSchema = z.optional(ForeignTableZodSchema);
