import { z } from 'zod/v3';

export const ConfigZodSchema = z
  .object({
    name: z.string(),
    setting: z.string(),
    category: z.string(),
    group: z.string(),
    subgroup: z.string(),
    unit: z.string().nullable(),
    short_desc: z.string(),
    extra_desc: z.string().nullable(),
    context: z.string(),
    vartype: z.string(),
    source: z.string(),
    min_val: z.string().nullable(),
    max_val: z.string().nullable(),
    enumvals: z.array(z.string()).nullable(),
    boot_val: z.string().nullable(),
    reset_val: z.string().nullable(),
    sourcefile: z.string().nullable(),
    sourceline: z.number().nullable(),
    pending_restart: z.boolean(),
  })
  .passthrough();

export const ConfigArrayZodSchema = z.array(ConfigZodSchema);
export const ConfigOptionalZodSchema = z.optional(ConfigZodSchema);

export type Config = z.infer<typeof ConfigZodSchema>;
export type ConfigArray = z.infer<typeof ConfigArrayZodSchema>;
export type ConfigOptional = z.infer<typeof ConfigOptionalZodSchema>;
