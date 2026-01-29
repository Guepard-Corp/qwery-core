import { z } from 'zod/v3';

export const FunctionZodSchema = z
  .object({
    id: z.number(),
    schema: z.string(),
    name: z.string(),
    language: z.string(),
    definition: z.string(),
    complete_statement: z.string(),
    args: z.array(
      z.object({
        mode: z.union([
          z.literal('in'),
          z.literal('out'),
          z.literal('inout'),
          z.literal('variadic'),
          z.literal('table'),
        ]),
        name: z.string(),
        type_id: z.number(),
        has_default: z.boolean(),
      }),
    ),
    argument_types: z.string(),
    identity_argument_types: z.string(),
    return_type_id: z.number(),
    return_type: z.string(),
    return_type_relation_id: z.union([z.number(), z.null()]),
    is_set_returning_function: z.boolean(),
    config_params: z.union([z.record(z.string(), z.string()), z.null()]),
  })
  .passthrough();

export type Function = z.infer<typeof FunctionZodSchema>;

export const FunctionArrayZodSchema = z.array(FunctionZodSchema);
export const FunctionOptionalZodSchema = z.optional(FunctionZodSchema);
