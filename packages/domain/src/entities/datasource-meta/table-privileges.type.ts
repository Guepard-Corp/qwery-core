import { z } from 'zod';

export const TablePrivilegesZodSchema = z
  .object({
    relation_id: z.number(),
    schema: z.string(),
    name: z.string(),
    kind: z.union([
      z.literal('table'),
      z.literal('view'),
      z.literal('materialized_view'),
      z.literal('foreign_table'),
      z.literal('partitioned_table'),
    ]),
    privileges: z.array(
      z.object({
        grantor: z.string(),
        grantee: z.string(),
        privilege_type: z.union([
          z.literal('SELECT'),
          z.literal('INSERT'),
          z.literal('UPDATE'),
          z.literal('DELETE'),
          z.literal('TRUNCATE'),
          z.literal('REFERENCES'),
          z.literal('TRIGGER'),
          z.literal('MAINTAIN'),
        ]),
        is_grantable: z.boolean(),
      }),
    ),
  })
  .passthrough();
export const TablePrivilegesArrayZodSchema = z.array(TablePrivilegesZodSchema);
export const TablePrivilegesOptionalZodSchema = z.optional(
  TablePrivilegesZodSchema,
);

export type TablePrivileges = z.infer<typeof TablePrivilegesZodSchema>;
export type TablePrivilegesArray = z.infer<
  typeof TablePrivilegesArrayZodSchema
>;
export type TablePrivilegesOptional = z.infer<
  typeof TablePrivilegesOptionalZodSchema
>;
