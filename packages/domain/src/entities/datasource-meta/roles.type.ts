import { z } from 'zod/v3';

export const RoleZodSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    isSuperuser: z.boolean(),
    canCreateDb: z.boolean(),
    canCreateRole: z.boolean(),
    inheritRole: z.boolean(),
    canLogin: z.boolean(),
    isReplicationRole: z.boolean(),
    canBypassRls: z.boolean(),
    activeConnections: z.number(),
    connectionLimit: z.number(),
    validUntil: z.union([z.string(), z.null()]),
    config: z.record(z.string(), z.string()),
  })
  .passthrough();
export const RoleArrayZodSchema = z.array(RoleZodSchema);
export const RoleOptionalZodSchema = z.optional(RoleZodSchema);

export type Role = z.infer<typeof RoleZodSchema>;
