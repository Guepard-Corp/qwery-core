import { z } from 'zod/v3';

const ColumnPrivilegeGrantZodSchema = z.object({
  grantor: z.string(),
  grantee: z.string(),
  privilege_type: z.union([
    z.literal('SELECT'),
    z.literal('INSERT'),
    z.literal('UPDATE'),
    z.literal('REFERENCES'),
  ]),
  is_grantable: z.boolean(),
});
const ColumnPrivilegesZodSchema = z.object({
  column_id: z.string(),
  relation_schema: z.string(),
  relation_name: z.string(),
  column_name: z.string(),
  privileges: z.array(ColumnPrivilegeGrantZodSchema),
});
export const ColumnPrivilegesArrayZodSchema = z.array(
  ColumnPrivilegesZodSchema,
);

const _PrivilegeGrantZodSchema = z.object({
  columnId: z.string(),
  grantee: z.string(),
  privilegeType: z.union([
    z.literal('ALL'),
    z.literal('SELECT'),
    z.literal('INSERT'),
    z.literal('UPDATE'),
    z.literal('REFERENCES'),
  ]),
  isGrantable: z.boolean().optional(),
});
type _ColumnPrivilegesGrant = z.infer<typeof _PrivilegeGrantZodSchema>;
