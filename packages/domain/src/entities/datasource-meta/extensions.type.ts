import { z } from 'zod';

export const DatasourceExtensionZod = z
  .object({
    name: z.string(),
    schema: z.string().nullable(),
    default_version: z.string(),
    installed_version: z.string().nullable(),
    comment: z.string(),
  })
  .passthrough();

export const DatasourceExtensionArrayZod = z.array(DatasourceExtensionZod);
export const DatasourceExtensionOptionalZod = z.optional(
  DatasourceExtensionZod,
);

export type DatasourceExtension = z.infer<typeof DatasourceExtensionZod>;
export type DatasourceExtensionArray = z.infer<
  typeof DatasourceExtensionArrayZod
>;
export type DatasourceExtensionOptional = z.infer<
  typeof DatasourceExtensionOptionalZod
>;
