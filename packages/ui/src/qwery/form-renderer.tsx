'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type {
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from 'react-hook-form';
import { z } from 'zod';

import { FieldGroup } from '@qwery/ui/field';
import { Button } from '@qwery/ui/button';
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
import { SecretInput } from '@qwery/ui/secret-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Switch } from '@qwery/ui/switch';
import { Textarea } from '@qwery/ui/textarea';

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
} from './schema-form-utils';

type ZodSchemaType = z.ZodTypeAny;

export interface FormRendererProps<T extends ZodSchemaType> {
  schema: T;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  defaultValues?: Partial<z.infer<T>>;
  formId?: string;
  onFormReady?: (values: z.infer<T>) => void;
  onValidityChange?: (isValid: boolean) => void;
  /** Current locale for i18n label resolution (e.g. from useTranslation().i18n.resolvedLanguage). */
  locale?: string;
}

function getRootSchema(schema: z.ZodTypeAny): {
  type: string;
  objectShape: Record<string, z.ZodTypeAny> | null;
  unionOptions: z.ZodTypeAny[];
} {
  const unwrapped = unwrapSchema(schema);
  const shape = getObjectShape(unwrapped);
  const unionOptions = getUnionOptions(unwrapped);
  const typeName =
    (unwrapped as { _def?: { typeName?: string } })._def?.typeName ?? '';
  return {
    type: typeName,
    objectShape: shape,
    unionOptions,
  };
}

function resolveLabel(
  meta: { label?: string; i18n?: Record<string, string> },
  fieldKey: string,
  locale?: string,
): string {
  if (locale && meta.i18n && typeof meta.i18n === 'object') {
    return (
      meta.i18n[locale] ??
      meta.i18n['en'] ??
      meta.label ??
      humanizeFieldKey(fieldKey)
    );
  }
  return meta.label ?? humanizeFieldKey(fieldKey);
}

export function FormRenderer<T extends z.ZodTypeAny>({
  schema,
  onSubmit,
  defaultValues,
  formId,
  onFormReady,
  onValidityChange,
  locale,
}: FormRendererProps<T>) {
  if (!schema) {
    throw new Error('No schema provided to FormRenderer');
  }

  const root = React.useMemo(() => getRootSchema(schema), [schema]);
  const isUnion = root.unionOptions.length > 0;
  const [unionVariant, setUnionVariant] = React.useState(0);
  const currentRootSchema: z.ZodTypeAny = isUnion
    ? (root.unionOptions[unionVariant] ?? root.unionOptions[0])!
    : schema;
  const unwrappedRoot = unwrapSchema(currentRootSchema);
  const currentShape = getObjectShape(unwrappedRoot);

  const schemaDefaults = React.useMemo(
    () => (currentShape ? extractDefaultsFromSchema(currentRootSchema) : {}),
    [currentRootSchema, currentShape],
  );

  const mergedDefaults = React.useMemo(
    () => ({ ...schemaDefaults, ...defaultValues }) as z.infer<T>,
    [schemaDefaults, defaultValues],
  );

  const form = useForm({
    resolver: zodResolver(
      currentRootSchema as Parameters<typeof zodResolver>[0],
    ),
    defaultValues: mergedDefaults as Record<string, unknown>,
  });

  // form.watch() required for onFormReady; incompatible with React Compiler memoization
  const watchedValues = form.watch(); // eslint-disable-line react-hooks/incompatible-library

  const lastSerializedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!onFormReady || watchedValues == null) return;
    const serialized = JSON.stringify(watchedValues);
    if (lastSerializedRef.current === serialized) return;
    lastSerializedRef.current = serialized;
    onFormReady(watchedValues as z.infer<T>);
  }, [onFormReady, watchedValues]);

  React.useEffect(() => {
    if (onValidityChange) {
      const isValid = form.formState.isValid;
      onValidityChange(isValid);
    }
  }, [onValidityChange, form.formState.isValid]);

  React.useEffect(() => {
    if (isUnion && root.unionOptions[unionVariant]) {
      const nextSchema = root.unionOptions[unionVariant];
      const nextDefaults = extractDefaultsFromSchema(nextSchema);
      form.reset(nextDefaults as Record<string, unknown>);
    }
  }, [unionVariant, isUnion, form, root.unionOptions]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values as z.infer<T>);
  });

  const renderField = React.useCallback(
    (
      fieldSchema: z.ZodTypeAny,
      path: string,
      fieldKey: string,
    ): React.ReactNode => {
      const unwrapped = unwrapSchema(fieldSchema);
      const typeName = getSchemaType(fieldSchema);
      const meta = getFieldMeta(fieldSchema, fieldKey);
      const label = resolveLabel(meta, fieldKey, locale);
      const description = meta.description;
      const placeholder = meta.placeholder;
      const defaultValue = getDefaultValue(fieldSchema);
      const displayPlaceholder =
        placeholder ??
        (defaultValue != null ? String(defaultValue) : undefined);

      if (typeName === 'ZodObject') {
        const shape = getObjectShape(unwrapped);
        if (!shape) return null;
        return (
          <FieldGroup key={path} className="space-y-4">
            {description && (
              <div className="text-muted-foreground text-sm font-medium">
                {description}
              </div>
            )}
            {Object.entries(shape).map(([k, v]) =>
              renderField(v, path ? `${path}.${k}` : k, k),
            )}
          </FieldGroup>
        );
      }

      if (typeName === 'ZodString') {
        const checks = getStringChecks(unwrapped);
        const isSecret =
          meta.secret ||
          (unwrapped as { _def?: { format?: string } })._def?.format ===
            'password';
        const inputType = isSecret
          ? 'password'
          : checks.email
            ? 'email'
            : checks.url
              ? 'url'
              : 'text';
        const isLongText = (checks.max ?? 0) > 200;
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => {
              const isProtected =
                typeof field.value === 'string' &&
                (field.value.startsWith('enc:') ||
                  field.value.startsWith('vault:'));
              return (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    {isLongText ? (
                      <Textarea
                        {...field}
                        placeholder={displayPlaceholder}
                        rows={4}
                      />
                    ) : isSecret && isProtected ? (
                      <div className="relative flex items-center gap-2">
                        <Input
                          readOnly
                          value="••••••••••••"
                          type="text"
                          className="bg-muted/50 flex-1 cursor-default font-mono opacity-80"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 py-0"
                          onClick={() => field.onChange('')}
                        >
                          Change
                        </Button>
                      </div>
                    ) : isSecret ? (
                      <SecretInput
                        {...field}
                        placeholder={displayPlaceholder}
                        value={field.value ?? ''}
                      />
                    ) : (
                      <Input
                        {...field}
                        type={inputType}
                        placeholder={displayPlaceholder}
                        value={field.value ?? ''}
                      />
                    )}
                  </FormControl>
                  {description && (
                    <FormDescription>{description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        );
      }

      if (typeName === 'ZodNumber') {
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={displayPlaceholder}
                    value={
                      field.value === undefined || field.value === null
                        ? ''
                        : field.value
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? undefined : Number(v));
                    }}
                  />
                </FormControl>
                {description && (
                  <FormDescription>{description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (typeName === 'ZodBoolean') {
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{label}</FormLabel>
                  {description && (
                    <FormDescription>{description}</FormDescription>
                  )}
                </div>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (typeName === 'ZodEnum') {
        const options = getEnumValues(unwrapped);
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value != null ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={description ?? `Select ${label}`}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {description && (
                  <FormDescription>{description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (typeName === 'ZodArray') {
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Textarea
                    value={
                      Array.isArray(field.value)
                        ? field.value.join(', ')
                        : ((field.value as string) ?? '')
                    }
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      const v = e.target.value;
                      field.onChange(
                        v ? v.split(',').map((s) => s.trim()) : [],
                      );
                    }}
                    placeholder={
                      description ?? 'Enter values separated by commas'
                    }
                    rows={3}
                  />
                </FormControl>
                {description && (
                  <FormDescription>{description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (typeName === 'ZodLiteral') {
        const def = (unwrapped as { _def?: { value?: unknown } })._def;
        const value = def?.value;
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({ field }: { field: { value?: unknown } }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input value={String(value ?? field.value ?? '')} readOnly />
                </FormControl>
                {description && (
                  <FormDescription>{description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (typeName === 'ZodUnion') {
        const options = getUnionOptions(fieldSchema);
        if (options.length === 0) {
          return (
            <FormField
              key={path}
              name={path as FieldPath<FieldValues>}
              control={form.control as never}
              render={({
                field,
              }: {
                field: ControllerRenderProps<
                  FieldValues,
                  FieldPath<FieldValues>
                >;
              }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value != null ? String(field.value) : ''}
                      placeholder={displayPlaceholder}
                    />
                  </FormControl>
                  {description && (
                    <FormDescription>{description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }
        return (
          <FormField
            key={path}
            name={path as FieldPath<FieldValues>}
            control={form.control as never}
            render={({
              field,
            }: {
              field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
            }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value != null ? String(field.value) : ''}
                    placeholder={displayPlaceholder}
                  />
                </FormControl>
                {description && (
                  <FormDescription>{description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      return (
        <FormField
          key={path}
          name={path as FieldPath<FieldValues>}
          control={form.control as never}
          render={({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, FieldPath<FieldValues>>;
          }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value != null ? String(field.value) : ''}
                  placeholder={displayPlaceholder}
                />
              </FormControl>
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    },
    [form, locale],
  );

  const fields = React.useMemo(() => {
    if (isUnion && root.unionOptions.length > 0) {
      const options = root.unionOptions;
      return (
        <>
          <div className="space-y-2">
            <div className="text-sm leading-none font-medium">Mode</div>
            <Select
              value={String(unionVariant)}
              onValueChange={(v) => setUnionVariant(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {options.map((_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    Option {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentShape &&
            Object.entries(currentShape).map(([k, v]) => renderField(v, k, k))}
        </>
      );
    }
    if (root.objectShape) {
      return Object.entries(root.objectShape).map(([k, v]) =>
        renderField(v, k, k),
      );
    }
    return null;
  }, [
    isUnion,
    root.unionOptions,
    root.objectShape,
    unionVariant,
    currentShape,
    renderField,
  ]);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} id={formId} className="space-y-4">
        {fields}
      </form>
    </Form>
  );
}
