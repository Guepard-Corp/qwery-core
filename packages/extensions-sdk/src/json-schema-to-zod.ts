import { z } from 'zod';

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  items?: JsonSchema;
  description?: string;
  format?: string;
  default?: unknown;
  oneOf?: JsonSchema[];
};

/**
 * Convert a minimal JSON Schema (v7-ish) to a Zod schema.
 * Supported: object/string/number/integer/boolean/array/enum + required + oneOf.
 * Falls back to z.any() when structure is not recognised.
 */
export function jsonSchemaToZod(schema: JsonSchema): z.ZodTypeAny {
  const withMetadata = <T extends z.ZodTypeAny>(
    base: T,
    schema: JsonSchema,
  ) => {
    let result = base;
    if (schema.description) {
      result = result.describe(schema.description);
    }
    if (schema.format) {
      (result._def as { format?: string }).format = schema.format;
    }
    return result;
  };

  // Handle oneOf first (union types)
  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const unionSchemas = schema.oneOf.map((subSchema) =>
      jsonSchemaToZod(subSchema),
    );
    return withMetadata(
      z.union(unionSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]),
      schema,
    );
  }

  switch (schema.type) {
    case 'string': {
      if (schema.enum && schema.enum.length > 0) {
        return withMetadata(
          z.enum([...schema.enum] as [string, ...string[]]),
          schema,
        );
      }
      return withMetadata(z.string(), schema);
    }
    case 'number':
    case 'integer': {
      return withMetadata(z.number(), schema);
    }
    case 'boolean': {
      return withMetadata(z.boolean(), schema);
    }
    case 'array': {
      const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any();
      return withMetadata(z.array(itemSchema), schema);
    }
    case 'object': {
      const shapeEntries =
        schema.properties && typeof schema.properties === 'object'
          ? Object.entries(schema.properties)
          : [];
      const shape: Record<string, z.ZodTypeAny> = {};
      const required = new Set(schema.required || []);

      for (const [key, value] of shapeEntries) {
        const fieldSchema = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? fieldSchema : fieldSchema.optional();
      }

      return withMetadata(z.object(shape), schema);
    }
    default: {
      // Enum with no explicit type
      if (schema.enum && schema.enum.length > 0) {
        return withMetadata(
          z.enum([...schema.enum] as [string, ...string[]]),
          schema,
        );
      }
      return withMetadata(z.any(), schema);
    }
  }
}
