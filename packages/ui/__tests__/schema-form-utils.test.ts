import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  extractDefaultsFromSchema,
  getDefaultValue,
  getEnumValues,
  getFieldMeta,
  getObjectShape,
  getSchemaType,
  getStringChecks,
  getUnionOptions,
  humanizeFieldKey,
  unwrapSchema,
} from '../src/qwery/schema-form-utils';

describe('unwrapSchema', () => {
  it('returns same schema when not optional/nullable/default', () => {
    const s = z.string();
    expect(unwrapSchema(s)).toBe(s);
  });

  it('unwraps ZodOptional to inner type', () => {
    const inner = z.string();
    const s = z.optional(inner);
    expect(getSchemaType(s)).toBe('ZodString');
  });

  it('unwraps ZodDefault to inner type', () => {
    const s = z.string().default('foo');
    expect(getSchemaType(s)).toBe('ZodString');
    expect(getDefaultValue(s)).toBe('foo');
  });
});

describe('getSchemaType', () => {
  it('returns ZodString for string schema', () => {
    expect(getSchemaType(z.string())).toBe('ZodString');
  });
  it('returns ZodNumber for number schema', () => {
    expect(getSchemaType(z.number())).toBe('ZodNumber');
  });
  it('returns ZodBoolean for boolean schema', () => {
    expect(getSchemaType(z.boolean())).toBe('ZodBoolean');
  });
  it('returns ZodObject for object schema', () => {
    expect(getSchemaType(z.object({ a: z.string() }))).toBe('ZodObject');
  });
  it('returns ZodEnum for enum schema', () => {
    expect(getSchemaType(z.enum(['a', 'b']))).toBe('ZodEnum');
  });
  it('returns ZodArray for array schema', () => {
    expect(getSchemaType(z.array(z.string()))).toBe('ZodArray');
  });
});

describe('getFieldMeta', () => {
  it('reads metadata from _def.metadata when present', () => {
    // Zod 4 stores .meta() in a registry; some runtimes or serialized schemas expose _def.metadata
    const s = z.string();
    interface SchemaWithMeta {
      _def?: { metadata?: Record<string, unknown> };
    }
    const def = (s as SchemaWithMeta)._def;
    if (def)
      def.metadata = {
        label: 'My Label',
        description: 'My description',
        placeholder: 'Enter value',
      };
    const meta = getFieldMeta(s);
    expect(meta.label).toBe('My Label');
    expect(meta.description).toBe('My description');
    expect(meta.placeholder).toBe('Enter value');
  });

  it('returns secret true when format is password in metadata', () => {
    const s = z.string();
    interface SchemaWithFormat {
      _def?: { metadata?: { format?: string } };
    }
    const def = (s as SchemaWithFormat)._def;
    if (def) def.metadata = { format: 'password' };
    const meta = getFieldMeta(s);
    expect(meta.secret).toBe(true);
  });

  it('returns empty object when no metadata', () => {
    const s = z.string();
    const meta = getFieldMeta(s);
    expect(meta).toEqual({});
  });
});

describe('getObjectShape', () => {
  it('returns shape for ZodObject', () => {
    const s = z.object({ a: z.string(), b: z.number() });
    const shape = getObjectShape(s);
    expect(shape).not.toBeNull();
    expect(Object.keys(shape!)).toEqual(['a', 'b']);
    expect(getSchemaType(shape!.a)).toBe('ZodString');
    expect(getSchemaType(shape!.b)).toBe('ZodNumber');
  });

  it('returns null for non-object schema', () => {
    expect(getObjectShape(z.string())).toBeNull();
    expect(getObjectShape(z.number())).toBeNull();
  });
});

describe('getDefaultValue', () => {
  it('returns default for ZodDefault', () => {
    expect(getDefaultValue(z.string().default('x'))).toBe('x');
    expect(getDefaultValue(z.number().default(42))).toBe(42);
  });

  it('returns undefined for schema without default', () => {
    expect(getDefaultValue(z.string())).toBeUndefined();
  });
});

describe('extractDefaultsFromSchema', () => {
  it('extracts defaults from object schema', () => {
    const s = z.object({
      a: z.string().default('x'),
      b: z.number(),
      c: z.boolean().default(true),
    });
    const defaults = extractDefaultsFromSchema(s);
    expect(defaults.a).toBe('x');
    expect(defaults.c).toBe(true);
    expect('b' in defaults).toBe(false);
  });

  it('returns empty object for non-object schema', () => {
    expect(extractDefaultsFromSchema(z.string())).toEqual({});
  });
});

describe('getEnumValues', () => {
  it('returns values for ZodEnum', () => {
    expect(getEnumValues(z.enum(['a', 'b', 'c']))).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for non-enum schema', () => {
    expect(getEnumValues(z.string())).toEqual([]);
  });
});

describe('getStringChecks', () => {
  it('returns email true for .email() string', () => {
    const checks = getStringChecks(z.string().email());
    expect(checks.email).toBe(true);
  });

  it('returns url true for .url() string', () => {
    const checks = getStringChecks(z.string().url());
    expect(checks.url).toBe(true);
  });
});

describe('getUnionOptions', () => {
  it('returns options for ZodUnion', () => {
    const s = z.union([
      z.object({ a: z.string() }),
      z.object({ b: z.number() }),
    ]);
    const options = getUnionOptions(s);
    expect(options.length).toBe(2);
    expect(getSchemaType(options[0]!)).toBe('ZodObject');
    expect(getSchemaType(options[1]!)).toBe('ZodObject');
  });

  it('returns empty array for non-union schema', () => {
    expect(getUnionOptions(z.string())).toEqual([]);
  });
});

describe('humanizeFieldKey', () => {
  it('capitalizes and adds spaces', () => {
    expect(humanizeFieldKey('sharedLink')).toBe('Shared Link');
    expect(humanizeFieldKey('my_field')).toBe('My Field');
  });
});
