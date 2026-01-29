import { z } from 'zod';

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
            // For unions (like in postgres driver), check all options
            const options = unwrapped._def.options as z.ZodTypeAny[];
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
    const description = schema._def.description;
    const format = (schema._def as any).format;
    return !!(
        (description && (description === 'secret:true' || description.includes('secret:true'))) ||
        format === 'password'
    );
}

function unwrapZodSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
    let current = schema;
    while (
        current instanceof z.ZodOptional ||
        current instanceof z.ZodNullable ||
        current instanceof z.ZodDefault
    ) {
        current = current._def.innerType;
    }
    return current;
}
