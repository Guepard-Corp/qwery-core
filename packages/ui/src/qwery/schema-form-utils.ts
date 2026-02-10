import type { z } from 'zod';

/**
 * Field metadata from Zod v4 .meta().
 * All schemas must provide .meta() with at least label/description as needed.
 */
export interface FieldMeta {
  label?: string;
  description?: string;
  placeholder?: string;
  secret?: boolean;
  i18n?: Record<string, string>;
  layout?: string;
  docsUrl?: string;
  supportsPreview?: boolean;
}

/** Zod v4 uses def.type (e.g. 'string', 'object'); Zod v3 uses typeName (e.g. 'ZodString'). */
type ZodDef = {
  typeName?: string;
  type?: string;
  innerType?: z.ZodTypeAny;
  metadata?: FieldMeta & { format?: string };
  description?: string;
  format?: string;
  shape?: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>);
  values?: readonly string[];
  entries?: Record<string, string>;
  checks?: Array<{
    kind: string;
    value?: number;
    format?: string;
    def?: { format?: string };
  }>;
  defaultValue?: unknown | (() => unknown);
  value?: unknown | (() => unknown);
  options?: z.ZodTypeAny[];
};

function getDef(schema: z.ZodTypeAny): ZodDef | undefined {
  const s = schema as { _def?: ZodDef; def?: ZodDef };
  return s._def ?? s.def;
}

/** Map Zod v4 def.type to our SchemaTypeName. */
function toTypeName(def: ZodDef): SchemaTypeName {
  const t = def.type ?? def.typeName;
  if (!t) return 'Unknown';
  const map: Record<string, SchemaTypeName> = {
    string: 'ZodString',
    number: 'ZodNumber',
    boolean: 'ZodBoolean',
    object: 'ZodObject',
    enum: 'ZodEnum',
    array: 'ZodArray',
    union: 'ZodUnion',
    literal: 'ZodLiteral',
    optional: 'ZodOptional',
    nullable: 'ZodNullable',
    default: 'ZodDefault',
  };
  return map[t] ?? (t.startsWith('Zod') ? t : 'Unknown');
}

/**
 * Unwrap ZodOptional, ZodNullable, ZodDefault to get the inner type (Zod v4).
 */
export function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  const def = getDef(schema);
  if (!def) return schema;

  const t = def.type ?? def.typeName;
  const isWrapper =
    t === 'ZodOptional' ||
    t === 'ZodDefault' ||
    t === 'ZodNullable' ||
    t === 'optional' ||
    t === 'default' ||
    t === 'nullable';
  if (isWrapper && def.innerType) return unwrapSchema(def.innerType);

  return schema;
}

export type SchemaTypeName =
  | 'ZodString'
  | 'ZodNumber'
  | 'ZodBoolean'
  | 'ZodEnum'
  | 'ZodObject'
  | 'ZodArray'
  | 'ZodUnion'
  | 'ZodLiteral'
  | 'ZodOptional'
  | 'ZodNullable'
  | 'ZodDefault'
  | string;

/**
 * Get the schema type name after unwrapping optional/nullable/default (Zod v4).
 */
export function getSchemaType(schema: z.ZodTypeAny): SchemaTypeName {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  if (!def) return 'Unknown';
  return toTypeName(def);
}

/**
 * Read field metadata from Zod v4 .meta() only.
 * All schemas are required to provide .meta(); no legacy _def.description fallback.
 */
export function getFieldMeta(
  schema: z.ZodTypeAny,
  _fieldKey?: string,
): FieldMeta {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  if (!def) return {};

  const meta = def.metadata;
  if (meta && typeof meta === 'object') {
    const secret =
      meta.secret === true ||
      (meta as { format?: string }).format === 'password';
    return {
      label: meta.label,
      description: meta.description,
      placeholder: meta.placeholder,
      secret,
      i18n: meta.i18n,
      layout: meta.layout,
      docsUrl: meta.docsUrl,
      supportsPreview: meta.supportsPreview,
    };
  }

  return {};
}

/**
 * Get object shape from ZodObject (Zod v4). Returns null if not an object schema.
 */
export function getObjectShape(
  schema: z.ZodTypeAny,
): Record<string, z.ZodTypeAny> | null {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  const typeName = def?.type ?? def?.typeName;
  if (typeName !== 'ZodObject' && typeName !== 'object') return null;
  if (!def) return null;

  const shape = def.shape;
  if (!shape) return null;
  const resolved =
    typeof shape === 'function'
      ? (shape as () => Record<string, z.ZodTypeAny>)()
      : (shape as Record<string, z.ZodTypeAny>);
  return resolved && typeof resolved === 'object' ? resolved : null;
}

/**
 * Extract default value from a single schema (Zod v4 ZodDefault).
 */
export function getDefaultValue(schema: z.ZodTypeAny): unknown {
  const def = getDef(schema);
  if (!def) return undefined;

  const t = def.type ?? def.typeName;
  if (t === 'ZodDefault' || t === 'default') {
    const val = def.defaultValue ?? def.value;
    if (val !== undefined) {
      return typeof val === 'function' ? (val as () => unknown)() : val;
    }
    if (def.innerType) return getDefaultValue(def.innerType);
  }

  if (
    (t === 'ZodOptional' ||
      t === 'ZodNullable' ||
      t === 'optional' ||
      t === 'nullable') &&
    def.innerType
  ) {
    return getDefaultValue(def.innerType);
  }

  return undefined;
}

/**
 * Extract all default values from a ZodObject schema (Zod v4).
 */
export function extractDefaultsFromSchema(
  schema: z.ZodTypeAny,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  let current: z.ZodTypeAny = schema;
  let def = getDef(current);

  const isWrapper = (d: ZodDef | undefined) => {
    const t = d?.type ?? d?.typeName;
    return (
      t === 'ZodOptional' ||
      t === 'ZodDefault' ||
      t === 'ZodNullable' ||
      t === 'optional' ||
      t === 'default' ||
      t === 'nullable'
    );
  };
  while (def && isWrapper(def)) {
    const inner = def.innerType;
    if (!inner) break;
    current = inner;
    def = getDef(current);
  }

  const typeName = def?.type ?? def?.typeName;
  if (typeName !== 'ZodObject' && typeName !== 'object') return defaults;
  if (!def) return defaults;

  const shape = def.shape;
  if (!shape) return defaults;

  const resolved =
    typeof shape === 'function'
      ? (shape as () => Record<string, z.ZodTypeAny>)()
      : (shape as Record<string, z.ZodTypeAny>);
  if (!resolved || typeof resolved !== 'object') return defaults;

  for (const [key, fieldSchema] of Object.entries(resolved)) {
    const value = getDefaultValue(fieldSchema as z.ZodTypeAny);
    if (value !== undefined) defaults[key] = value;
  }

  return defaults;
}

/**
 * Get enum values from ZodEnum (Zod v4).
 */
export function getEnumValues(schema: z.ZodTypeAny): string[] {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  const t = def?.type ?? def?.typeName;
  if (t !== 'ZodEnum' && t !== 'enum') return [];
  const entries = def!.entries ?? def!.values;
  if (entries) {
    if (Array.isArray(entries)) return Array.from(entries);
    return Object.keys(entries);
  }
  return [];
}

/**
 * Get string checks (email, url, min, max) from ZodString (Zod v4).
 */
export function getStringChecks(schema: z.ZodTypeAny): {
  email?: boolean;
  url?: boolean;
  min?: number;
  max?: number;
} {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  const checks = def?.checks ?? [];
  const result: {
    email?: boolean;
    url?: boolean;
    min?: number;
    max?: number;
  } = {};

  for (const check of checks) {
    const c = check as {
      kind?: string;
      value?: number;
      format?: string;
      def?: { format?: string };
    };
    const format = c.format ?? c.def?.format;
    if (c.kind === 'email' || format === 'email') result.email = true;
    if (c.kind === 'url' || format === 'url') result.url = true;
    if (c.kind === 'min' || (c as { kind?: string }).kind === 'min')
      result.min = c.value;
    if (c.kind === 'max' || (c as { kind?: string }).kind === 'max')
      result.max = c.value;
  }

  return result;
}

/**
 * Get union options from ZodUnion (Zod v4).
 */
export function getUnionOptions(schema: z.ZodTypeAny): z.ZodTypeAny[] {
  const unwrapped = unwrapSchema(schema);
  const def = getDef(unwrapped);
  const t = def?.type ?? def?.typeName;
  if (t !== 'ZodUnion' && t !== 'union') return [];
  const options = def!.options;
  return options ? Array.from(options) : [];
}

/**
 * Humanize a field key for use as label when meta.label is missing.
 */
export function humanizeFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_](.)/g, (_, c) => ` ${c.toUpperCase()}`)
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
