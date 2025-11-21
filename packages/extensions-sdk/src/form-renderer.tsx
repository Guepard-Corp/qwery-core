'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { FieldPath, FieldValues } from 'react-hook-form';
import type { z } from 'zod';

import { FieldGroup } from '@qwery/ui/field';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qwery/ui/form';
import { Input } from '@qwery/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Switch } from '@qwery/ui/switch';
import { Textarea } from '@qwery/ui/textarea';

type ZodSchemaType = z.ZodTypeAny;

interface FormRendererProps<T extends ZodSchemaType> {
  schema: T;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  defaultValues?: Partial<z.infer<T>>;
  formId?: string;
  onFormReady?: (values: z.infer<T>) => void;
}

/**
 * Extract default value from a Zod schema
 */
function getDefaultValue(schema: z.ZodTypeAny): unknown {
  try {
    const def = (
      schema as {
        _def?: {
          typeName?: string;
          defaultValue?: unknown | (() => unknown);
          innerType?: z.ZodTypeAny;
          value?: unknown | (() => unknown);
        };
      }
    )._def;

    // Check for ZodDefault
    if (def?.typeName === 'ZodDefault') {
      // Try different possible structures for default value
      if (def.defaultValue !== undefined) {
        const defaultValue =
          typeof def.defaultValue === 'function'
            ? def.defaultValue()
            : def.defaultValue;
        if (defaultValue !== undefined) {
          return defaultValue;
        }
      }

      // Also check 'value' property (some Zod versions use this)
      if (def.value !== undefined) {
        const defaultValue =
          typeof def.value === 'function' ? def.value() : def.value;
        if (defaultValue !== undefined) {
          return defaultValue;
        }
      }
    }

    // If wrapped in Optional/Nullable, check inner type
    if (
      def?.innerType &&
      (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable')
    ) {
      return getDefaultValue(def.innerType as z.ZodTypeAny);
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

/**
 * Extract all default values from a ZodObject schema
 */
function extractDefaultsFromSchema(
  schema: z.ZodTypeAny,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  try {
    // Unwrap optional/nullable/default wrappers to get to the ZodObject
    let currentSchema = schema;
    let schemaDef = (
      currentSchema as {
        _def?: { typeName?: string; innerType?: z.ZodTypeAny };
      }
    )._def;

    while (
      schemaDef?.typeName === 'ZodOptional' ||
      schemaDef?.typeName === 'ZodDefault' ||
      schemaDef?.typeName === 'ZodNullable'
    ) {
      const innerType = schemaDef.innerType;
      if (innerType) {
        currentSchema = innerType as z.ZodTypeAny;
        schemaDef = (currentSchema as { _def?: { typeName?: string } })._def;
      } else {
        break;
      }
    }

    // Check if it's a ZodObject
    const finalDef = (
      currentSchema as { _def?: { typeName?: string; [key: string]: unknown } }
    )._def;
    if (finalDef?.typeName === 'ZodObject') {
      const shapeFunction = (finalDef as { shape?: unknown })?.shape;

      if (shapeFunction && typeof shapeFunction === 'function') {
        const shape = (shapeFunction as () => Record<string, z.ZodTypeAny>)();

        if (shape && typeof shape === 'object') {
          Object.entries(shape).forEach(([key, fieldSchema]) => {
            const defaultValue = getDefaultValue(fieldSchema);
            if (defaultValue !== undefined) {
              defaults[key] = defaultValue;
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error extracting defaults from schema:', error);
  }

  return defaults;
}

/**
 * Get the description from a Zod schema using Zod's internal structure
 */
function getDescription(schema: z.ZodTypeAny): string | undefined {
  try {
    // Access Zod's internal _def for description
    const def = (schema as { _def?: { description?: string } })._def;
    return def?.description;
  } catch {
    return undefined;
  }
}

/**
 * Unwrap optional, nullable, or default wrappers
 */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  const def = (schema as { _def?: unknown })._def;
  if (!def) return schema;

  const defType = (def as { typeName?: string })?.typeName;

  if (defType === 'ZodOptional' || defType === 'ZodDefault') {
    const innerType = (def as { innerType?: z.ZodTypeAny })?.innerType;
    if (innerType) return unwrapSchema(innerType);
  }

  if (defType === 'ZodNullable') {
    const innerType = (def as { innerType?: z.ZodTypeAny })?.innerType;
    if (innerType) return unwrapSchema(innerType);
  }

  return schema;
}

/**
 * Check if schema type matches
 */
function isSchemaType(schema: z.ZodTypeAny, typeName: string): boolean {
  try {
    const def = (schema as { _def?: { typeName?: string } })._def;
    const actualTypeName = def?.typeName;

    // Handle wrapped types - unwrap them first
    if (
      actualTypeName === 'ZodOptional' ||
      actualTypeName === 'ZodDefault' ||
      actualTypeName === 'ZodNullable'
    ) {
      const innerType = (def as { innerType?: z.ZodTypeAny })?.innerType;
      if (innerType) {
        return isSchemaType(innerType, typeName);
      }
    }

    return actualTypeName === typeName;
  } catch {
    return false;
  }
}

/**
 * Get enum values from ZodEnum
 */
function getEnumValues(schema: z.ZodTypeAny): string[] {
  try {
    const def = (schema as { _def?: { values?: readonly string[] } })._def;
    return Array.from(def?.values || []);
  } catch {
    return [];
  }
}

/**
 * Get checks from ZodString (email, url, min, max, etc.)
 */
function getStringChecks(schema: z.ZodTypeAny): {
  email?: boolean;
  url?: boolean;
  min?: number;
  max?: number;
} {
  try {
    const def = (
      schema as { _def?: { checks?: Array<{ kind: string; value?: number }> } }
    )._def;
    const checks = def?.checks || [];
    const result: {
      email?: boolean;
      url?: boolean;
      min?: number;
      max?: number;
    } = {};

    checks.forEach((check: { kind: string; value?: number }) => {
      if (check.kind === 'email') result.email = true;
      if (check.kind === 'url') result.url = true;
      if (check.kind === 'min') result.min = check.value;
      if (check.kind === 'max') result.max = check.value;
    });

    return result;
  } catch {
    return {};
  }
}

/**
 * Render a single form field based on Zod schema type
 */
function renderField(
  schema: z.ZodTypeAny,
  name: string,
  path: string,
): React.ReactNode {
  // Unwrap optional/nullable/default
  const unwrapped = unwrapSchema(schema);
  const description = getDescription(unwrapped);
  const defaultValue = getDefaultValue(schema);

  // Format default value for placeholder display
  const placeholder =
    defaultValue !== undefined
      ? `${description ? `${description} (default: ${defaultValue})` : `Default: ${defaultValue}`}`
      : description;

  // String
  if (isSchemaType(unwrapped, 'ZodString')) {
    const checks = getStringChecks(unwrapped);
    const inputType = checks.email ? 'email' : checks.url ? 'url' : 'text';
    const isLongText = checks.max && checks.max > 200;

    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <FormControl>
              {isLongText ? (
                <Textarea {...field} placeholder={placeholder} rows={4} />
              ) : (
                <Input {...field} type={inputType} placeholder={placeholder} />
              )}
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Number
  if (isSchemaType(unwrapped, 'ZodNumber')) {
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                placeholder={placeholder}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? undefined : Number(value));
                }}
                value={field.value ?? ''}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Boolean
  if (isSchemaType(unwrapped, 'ZodBoolean')) {
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{name}</FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Enum
  if (isSchemaType(unwrapped, 'ZodEnum')) {
    const options = getEnumValues(unwrapped);
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={description || `Select ${name}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Literal
  if (isSchemaType(unwrapped, 'ZodLiteral')) {
    const def = (unwrapped as { _def?: { value?: unknown } })._def;
    const value = def?.value;
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <FormControl>
              <Input {...field} value={String(value ?? '')} readOnly />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Object (nested)
  if (isSchemaType(unwrapped, 'ZodObject')) {
    const def = (
      unwrapped as { _def?: { shape?: Record<string, z.ZodTypeAny> } }
    )._def;
    const shape = def?.shape || {};
    const entries = Object.entries(shape);

    return (
      <FieldGroup key={path} className="space-y-4">
        {description && (
          <div className="text-muted-foreground text-sm font-medium">
            {description}
          </div>
        )}
        {entries.map(([key, value]) =>
          renderField(value, key, path ? `${path}.${key}` : key),
        )}
      </FieldGroup>
    );
  }

  // Array
  if (isSchemaType(unwrapped, 'ZodArray')) {
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={
                  Array.isArray(field.value)
                    ? field.value.join(', ')
                    : field.value || ''
                }
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(
                    value ? value.split(',').map((s) => s.trim()) : [],
                  );
                }}
                placeholder={description || 'Enter values separated by commas'}
                rows={3}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Union (fallback to text input)
  if (isSchemaType(unwrapped, 'ZodUnion')) {
    return (
      <FormField
        key={path}
        name={path as FieldPath<FieldValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{name}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={placeholder} />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Fallback: render as text input
  return (
    <FormField
      key={path}
      name={path as FieldPath<FieldValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{name}</FormLabel>
          <FormControl>
            <Input {...field} placeholder={description} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Form renderer that automatically generates form fields from a Zod schema
 */
export function FormRenderer<T extends ZodSchemaType>({
  schema,
  onSubmit,
  defaultValues,
  formId,
  onFormReady,
}: FormRendererProps<T>) {
  // Ensure schema is a valid Zod schema
  if (!schema || typeof schema.parse !== 'function') {
    throw new Error('Invalid Zod schema provided to FormRenderer');
  }

  // Extract default values from schema
  const schemaDefaults = React.useMemo(
    () => extractDefaultsFromSchema(schema),
    [schema],
  );

  // Merge provided defaultValues with schema defaults (provided values take precedence)
  const mergedDefaults = React.useMemo(() => {
    return { ...schemaDefaults, ...defaultValues } as z.infer<T>;
  }, [schemaDefaults, defaultValues]);

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema as z.ZodTypeAny),
    defaultValues: mergedDefaults,
  });

  // Watch all form values to detect changes
  const watchedValues = form.watch();
  const previousValuesRef = React.useRef<z.infer<T> | null>(null);
  const onFormReadyRef = React.useRef(onFormReady);
  onFormReadyRef.current = onFormReady;

  // Expose current form values to parent when they actually change
  React.useEffect(() => {
    if (!onFormReadyRef.current) return;

    // Get current form values
    const values = form.getValues();

    // Deep comparison to avoid infinite loops
    const valuesString = JSON.stringify(values);
    const previousString = previousValuesRef.current
      ? JSON.stringify(previousValuesRef.current)
      : null;

    // Only notify if values actually changed
    if (valuesString !== previousString) {
      previousValuesRef.current = values as z.infer<T>;

      // Validate with schema
      try {
        const validatedValues = schema.parse(values);
        onFormReadyRef.current(validatedValues);
      } catch {
        // If validation fails, still pass the raw values
        onFormReadyRef.current(values);
      }
    }
  }, [watchedValues, form, schema]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  // Extract fields from schema
  const fields: React.ReactNode[] = [];

  // Use Zod's structure to get shape from ZodObject
  let currentSchema = schema;

  // Unwrap optional/nullable/default wrappers
  let schemaDef = (
    currentSchema as { _def?: { typeName?: string; innerType?: z.ZodTypeAny } }
  )._def;
  while (
    schemaDef?.typeName === 'ZodOptional' ||
    schemaDef?.typeName === 'ZodDefault' ||
    schemaDef?.typeName === 'ZodNullable'
  ) {
    const innerType = schemaDef.innerType;
    if (innerType) {
      currentSchema = innerType as T;
      schemaDef = (currentSchema as { _def?: { typeName?: string } })._def;
    } else {
      break;
    }
  }

  // Check if it's a ZodObject
  const finalDef = (
    currentSchema as { _def?: { typeName?: string; [key: string]: unknown } }
  )._def;
  const isZodObject = finalDef?.typeName === 'ZodObject';

  if (isZodObject) {
    const shapeFunction = (finalDef as { shape?: unknown })?.shape;

    if (shapeFunction && typeof shapeFunction === 'function') {
      try {
        const shape = (shapeFunction as () => Record<string, z.ZodTypeAny>)();

        if (shape && typeof shape === 'object') {
          const shapeEntries = Object.entries(shape);

          // Check if this looks like a datasource connection form
          const isDatasourceForm = [
            'host',
            'port',
            'database',
            'user',
            'password',
          ].some((key) =>
            shapeEntries.some(([k]) => k.toLowerCase() === key.toLowerCase()),
          );

          if (isDatasourceForm && shapeEntries.length > 0) {
            // Group fields for datasource layout
            const connectionFields: Array<[string, z.ZodTypeAny]> = [];
            const otherFields: Array<[string, z.ZodTypeAny]> = [];

            shapeEntries.forEach(([key, value]) => {
              const lowerKey = key.toLowerCase();
              if (
                ['host', 'port', 'database', 'user', 'password'].includes(
                  lowerKey,
                )
              ) {
                connectionFields.push([key, value]);
              } else {
                otherFields.push([key, value]);
              }
            });

            // Render connection fields in grid layout
            if (connectionFields.length > 0) {
              const findField = (fieldName: string) =>
                connectionFields.find(
                  ([k]) => k.toLowerCase() === fieldName.toLowerCase(),
                );

              const hostField = findField('host');
              const portField = findField('port');
              const databaseField = findField('database');
              const userField = findField('user');
              const passwordField = findField('password');

              // First row: host - port
              if (hostField || portField) {
                fields.push(
                  <div
                    key="connection-row-1"
                    className="grid grid-cols-2 gap-4"
                  >
                    {hostField &&
                      renderField(hostField[1], hostField[0], hostField[0])}
                    {portField &&
                      renderField(portField[1], portField[0], portField[0])}
                  </div>,
                );
              }

              // Second row: database (full width)
              if (databaseField) {
                fields.push(
                  <div key="connection-row-2">
                    {renderField(
                      databaseField[1],
                      databaseField[0],
                      databaseField[0],
                    )}
                  </div>,
                );
              }

              // Third row: user - password
              if (userField || passwordField) {
                fields.push(
                  <div
                    key="connection-row-3"
                    className="grid grid-cols-2 gap-4"
                  >
                    {userField &&
                      renderField(userField[1], userField[0], userField[0])}
                    {passwordField &&
                      renderField(
                        passwordField[1],
                        passwordField[0],
                        passwordField[0],
                      )}
                  </div>,
                );
              }
            }

            // Render other fields normally
            otherFields.forEach(([key, value]) => {
              fields.push(renderField(value, key, key));
            });
          } else {
            // Default layout for non-datasource forms
            shapeEntries.forEach(([key, value]) => {
              fields.push(renderField(value, key, key));
            });
          }
        }
      } catch (error) {
        console.error('Error calling shape function:', error, {
          shapeFunction,
          finalDef,
        });
      }
    } else {
      console.log('Shape is not a function:', {
        shape: shapeFunction,
        shapeType: typeof shapeFunction,
        defKeys: Object.keys(finalDef || {}),
        fullDef: finalDef,
      });
    }
  }

  // Fallback: If no fields extracted, try rendering as single field
  if (fields.length === 0) {
    console.error('No fields extracted from schema', {
      schema,
      currentSchema,
      schemaDef,
      isZodObject,
      finalDef,
    });
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <FieldGroup>{fields}</FieldGroup>
        {/* Submit button should be provided by parent component */}
      </form>
    </Form>
  );
}
