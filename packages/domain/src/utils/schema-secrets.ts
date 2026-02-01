import { z } from 'zod';

/** Zod internal def shape we rely on (description, innerType). Zod 4 types omit these. */
type ZodDefWithDescription = { description?: string; format?: string };
type ZodDefWithInnerType = { innerType: z.ZodTypeAny };

/**
 * Utility to identify which fields in a Zod schema are marked as secrets.
 * It looks for fields with .describe('secret:true')
 */
export function getSecretFields(schema: z.ZodTypeAny): string[] {
  const secrets: string[] = [];

  try {
    const unwrapped = unwrapZodSchema(schema);

    if (unwrapped instanceof z.ZodObject) {
      const shape = unwrapped.shape;
      for (const key in shape) {
        if (isSecret(shape[key])) {
          secrets.push(key);
        }
      }
    } else if (unwrapped instanceof z.ZodUnion) {
      // For unions (like in postgres driver), check all options (Zod 4 uses readonly)
      const options = (unwrapped._def as unknown as { options: z.ZodTypeAny[] })
        .options;
      for (const option of options) {
        secrets.push(...getSecretFields(option));
      }
    }
  } catch (error) {
    console.error('Error identifying secret fields:', error);
  }

  return [...new Set(secrets)];
}

function isSecret(schema: z.ZodTypeAny): boolean {
  const def = schema._def as ZodDefWithDescription;
  const description = def.description;
  const format = def.format;
  return !!(
    (description &&
      (description === 'secret:true' || description.includes('secret:true'))) ||
    format === 'password'
  );
}

function unwrapZodSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: z.ZodTypeAny = schema;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodDefault
  ) {
    current = (current._def as unknown as ZodDefWithInnerType).innerType;
  }
  return current;
}
