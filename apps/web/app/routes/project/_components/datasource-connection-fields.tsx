'use client';

import type { Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { DatasourceFormConfigPayload } from '@qwery/extensions-sdk';
import { Eye, EyeOff, Database, Link as LinkIcon } from 'lucide-react';
import { Button } from '@qwery/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qwery/ui/form';
import { Input } from '@qwery/ui/input';
import { Switch } from '@qwery/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@qwery/ui/tabs';
import { Textarea } from '@qwery/ui/textarea';
import { cn } from '@qwery/ui/utils';
import type {
  DatasourceFormPlaceholders,
  FieldLabels,
} from '~/lib/utils/datasource-form-config';
import {
  getDatasourceFormConfig,
  getProviderZodSchema,
} from '~/lib/utils/datasource-form-config';
import { parseConnectionString } from '~/lib/utils/parse-connection-string';

const LABEL_CLASS =
  'text-[13px] font-bold uppercase tracking-[0.05em] text-foreground';

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  label,
  autoComplete = 'off',
  ...rest
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  autoComplete?: string;
} & React.ComponentPropsWithoutRef<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      {label ? <span className={LABEL_CLASS}>{label}</span> : null}
      <div className="group relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="bg-background/50 focus:bg-background pr-10 transition-colors"
          {...rest}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground/60 hover:text-foreground absolute top-0 right-0 h-full w-10 hover:bg-transparent"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide' : 'Show'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function DetailsFieldsGrid({
  control,
  fieldLabels,
  placeholders,
  showSslToggle,
}: {
  control: React.ComponentProps<typeof FormField>['control'];
  fieldLabels: FieldLabels;
  placeholders: DatasourceFormPlaceholders;
  showSslToggle: boolean;
}) {
  return (
    <div className="grid gap-7 p-1">
      <FormField
        control={control}
        name="host"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              {fieldLabels.host ?? 'Host Address'}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder={placeholders.host}
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <FormField
          control={control}
          name="port"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={LABEL_CLASS}>
                {fieldLabels.port ?? 'Port'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder={placeholders.port}
                  inputMode="numeric"
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="database"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={LABEL_CLASS}>
                {fieldLabels.database ?? 'Database Name'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder={placeholders.database}
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <FormField
          control={control}
          name="username"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={LABEL_CLASS}>
                {fieldLabels.username ?? 'Username'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder={placeholders.username}
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <PasswordInput
                  id="ds-password"
                  label={fieldLabels.password ?? 'Password'}
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  placeholder={placeholders.password}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {showSslToggle && (
        <FormField
          control={control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg py-2">
              <FormLabel className={LABEL_CLASS}>SSL required</FormLabel>
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
      )}
    </div>
  );
}

function getConnectionValueKey(
  connectionFieldKind: string,
  formConfig?: DatasourceFormConfigPayload | null,
): string {
  if (formConfig?.preset === 'embeddable') return 'database';
  if (formConfig?.preset === 's3') return 'bucket';
  switch (connectionFieldKind) {
    case 'apiKey':
      return 'apiKey';
    case 'sharedLink':
      return 'sharedLink';
    case 'fileUrl':
      return formConfig?.normalizedKey ?? 'url';
    default:
      return 'connectionUrl';
  }
}

const S3_FIELD_KEYS = [
  'provider',
  'format',
  'aws_access_key_id',
  'aws_secret_access_key',
  'aws_session_token',
  'endpoint_url',
  'region',
  'bucket',
  'prefix',
  'includes',
  'excludes',
] as const;

const S3_PROVIDERS = [
  { value: 'aws', label: 'AWS S3' },
  { value: 'digitalocean', label: 'DigitalOcean Spaces' },
  { value: 'minio', label: 'MinIO' },
  { value: 'other', label: 'Other (S3-compatible)' },
] as const;

const S3_FORMATS = [
  { value: 'parquet', label: 'Parquet' },
  { value: 'json', label: 'JSON' },
] as const;

function S3FieldsGrid({
  control,
}: {
  control: React.ComponentProps<typeof FormField>['control'];
}) {
  const provider = useWatch({ control, name: 'provider', defaultValue: 'aws' });
  const showEndpoint = provider !== 'aws';
  const isDigitalOcean = provider === 'digitalocean';

  return (
    <div className="grid gap-5 p-1">
      <FormField
        control={control}
        name="provider"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>Provider</FormLabel>
            <Select
              value={(field.value as string) || 'aws'}
              onValueChange={(v) => field.onChange(v)}
            >
              <SelectTrigger className="bg-background/50" id={field.name}>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="z-[110]" position="popper">
                {S3_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="format"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>File format</FormLabel>
            <Select
              value={(field.value as string) || 'parquet'}
              onValueChange={(v) => field.onChange(v)}
            >
              <SelectTrigger className="bg-background/50" id={field.name}>
                <SelectValue placeholder="Parquet or JSON" />
              </SelectTrigger>
              <SelectContent className="z-[110]" position="popper">
                {S3_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="aws_access_key_id"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              {isDigitalOcean ? 'Spaces Access Key ID' : 'Access Key ID'}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder={isDigitalOcean ? 'DO00...' : 'AWS_ACCESS_KEY_ID'}
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="aws_secret_access_key"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              {isDigitalOcean ? 'Spaces Secret Key' : 'Secret Access Key'}
            </FormLabel>
            <FormControl>
              <PasswordInput
                id="s3-secret-key"
                label=""
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                placeholder={
                  isDigitalOcean ? 'Spaces secret key' : 'AWS_SECRET_ACCESS_KEY'
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="aws_session_token"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              Session token (optional, for temporary credentials)
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder="AWS_SESSION_TOKEN"
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showEndpoint && (
        <FormField
          control={control}
          name="endpoint_url"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className={LABEL_CLASS}>
                {isDigitalOcean ? 'Endpoint URL (optional)' : 'Endpoint URL'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder={
                    isDigitalOcean
                      ? 'https://fra1.digitaloceanspaces.com'
                      : 'https://nyc3.digitaloceanspaces.com'
                  }
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
        name="region"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              {isDigitalOcean ? 'Spaces region' : 'Region'}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder={isDigitalOcean ? 'fra1' : 'us-east-1'}
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="bucket"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              {isDigitalOcean ? 'Space name' : 'Bucket'}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder={isDigitalOcean ? 'qwery' : 'my-bucket'}
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="prefix"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>Prefix (optional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder="folder/ or leave empty"
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="includes"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              Include patterns (optional)
            </FormLabel>
            <FormControl>
              <Input
                value={
                  Array.isArray(field.value)
                    ? field.value.join(', ')
                    : typeof field.value === 'string'
                      ? field.value
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value.trim();
                  field.onChange(
                    v
                      ? v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [],
                  );
                }}
                placeholder="**/*.parquet or **/*.json"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="excludes"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              Exclude patterns (optional)
            </FormLabel>
            <FormControl>
              <Input
                value={
                  Array.isArray(field.value)
                    ? field.value.join(', ')
                    : typeof field.value === 'string'
                      ? field.value
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value.trim();
                  field.onChange(
                    v
                      ? v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [],
                  );
                }}
                placeholder="**/skip/**"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

const DEFAULT_KEYS = [
  'host',
  'port',
  'database',
  'username',
  'password',
  'connectionUrl',
  'sharedLink',
  'apiKey',
  'url',
  'jsonUrl',
] as const;

const S3_DEFAULT_KEYS = [
  'provider',
  'format',
  'aws_access_key_id',
  'aws_secret_access_key',
  'aws_session_token',
  'endpoint_url',
  'region',
  'bucket',
  'prefix',
  'includes',
  'excludes',
] as const;

function defaultValues(extensionId?: string): Record<string, unknown> {
  if (extensionId === 's3') {
    return {
      ...Object.fromEntries(DEFAULT_KEYS.map((k) => [k, ''])),
      provider: 'aws',
      format: 'parquet',
      ...Object.fromEntries(
        S3_DEFAULT_KEYS.filter((k) => k !== 'provider' && k !== 'format').map(
          (k) => [k, k === 'includes' || k === 'excludes' ? [] : ''],
        ),
      ),
    };
  }
  return Object.fromEntries(DEFAULT_KEYS.map((k) => [k, ''])) as Record<
    string,
    unknown
  >;
}

function asSubmitRecord(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined && v !== ''),
  );
}

const DETAILS_KEYS = [
  'host',
  'port',
  'database',
  'schema',
  'username',
  'password',
] as const;

export function DatasourceConnectionFields({
  extensionId,
  formConfig,
  onFormReady,
  onValidityChange,
  _formId,
  className,
}: {
  extensionId: string;
  formConfig?: DatasourceFormConfigPayload | null;
  onFormReady: (values: Record<string, unknown>) => void;
  onValidityChange: (valid: boolean) => void;
  _formId?: string;
  className?: string;
}) {
  const config = useMemo(
    () => getDatasourceFormConfig(extensionId, formConfig ?? undefined),
    [extensionId, formConfig],
  );

  const connectionValueKey = getConnectionValueKey(
    config.connectionFieldKind,
    formConfig ?? undefined,
  );

  const schema = useMemo(
    () => getProviderZodSchema(extensionId, formConfig ?? undefined),
    [extensionId, formConfig],
  );

  const providerResolver: Resolver<Record<string, unknown>> = useCallback(
    (values) => {
      const result = schema.safeParse(values);
      if (result.success)
        return {
          values: result.data as Record<string, unknown>,
          errors: {},
        };
      const errors: Record<string, { type: string; message: string }> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        errors[path] = { type: 'custom', message: issue.message };
      }
      return { values: {}, errors };
    },
    [schema],
  );

  const form = useForm<Record<string, unknown>>({
    defaultValues: {
      ...defaultValues(extensionId),
      ...(config.showSslToggle ? { ssl: false } : {}),
    } as Record<string, unknown>,
    resolver: providerResolver,
    mode: 'onChange',
  });

  useEffect(() => {
    form.trigger();
  }, [form]);

  const [activeTab, setActiveTab] = useState<string>(
    config.showDetailsTab ? 'details' : 'connection',
  );

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const values = useWatch({ control: form.control });
  const isValid = form.formState.isValid;

  // Parse connection string when entered in connection tab
  const connectionStringValue = useWatch({
    control: form.control,
    name: connectionValueKey,
  });

  useEffect(() => {
    if (
      activeTab === 'connection' &&
      connectionStringValue &&
      typeof connectionStringValue === 'string' &&
      connectionStringValue.trim() &&
      config.showDetailsTab
    ) {
      const parsed = parseConnectionString(connectionStringValue, extensionId);
      if (parsed) {
        const currentValues = form.getValues();
        form.setValue('host', parsed.host || currentValues.host || '', {
          shouldValidate: false,
        });
        if (parsed.port) {
          form.setValue('port', parsed.port, { shouldValidate: false });
        }
        if (parsed.database) {
          form.setValue('database', parsed.database, { shouldValidate: false });
        }
        if (parsed.username) {
          form.setValue('username', parsed.username, { shouldValidate: false });
        }
        if (parsed.password) {
          form.setValue('password', parsed.password, { shouldValidate: false });
        }
        if (parsed.ssl !== undefined && config.showSslToggle) {
          form.setValue('ssl', parsed.ssl, { shouldValidate: false });
        }
      }
    }
  }, [
    connectionStringValue,
    activeTab,
    extensionId,
    config.showDetailsTab,
    config.showSslToggle,
    form,
    connectionValueKey,
  ]);

  const {
    placeholders,
    fieldLabels,
    showDetailsTab,
    showConnectionStringTab,
    showSslToggle,
    connectionFieldKind,
  } = config;

  const showTabs = showDetailsTab && showConnectionStringTab;
  const isS3 = extensionId === 's3';

  const prevValuesRef = useRef<string>('');
  useEffect(() => {
    const currentValues = values ?? {};

    // Filter values based on active tab
    let submitRecord: Record<string, unknown>;
    if (activeTab === 'connection' && showTabs) {
      // Only submit connection string tab content
      submitRecord = asSubmitRecord({
        [connectionValueKey]: currentValues[connectionValueKey],
      });
    } else if (activeTab === 'details' && showTabs) {
      // Only submit details tab content
      const detailsValues: Record<string, unknown> = {};
      DETAILS_KEYS.forEach((key) => {
        if (currentValues[key] !== undefined && currentValues[key] !== '') {
          detailsValues[key] = currentValues[key];
        }
      });
      if (showSslToggle && currentValues.ssl !== undefined) {
        detailsValues.ssl = currentValues.ssl;
      }
      submitRecord = asSubmitRecord(detailsValues);
    } else if (isS3) {
      const s3Values: Record<string, unknown> = {};
      S3_FIELD_KEYS.forEach((key) => {
        const v = currentValues[key];
        if (v === undefined || v === '') return;
        if (Array.isArray(v) && v.length === 0) return;
        s3Values[key] = v;
      });
      submitRecord = asSubmitRecord(s3Values);
    } else {
      submitRecord = asSubmitRecord(currentValues);
    }

    const valuesKey = JSON.stringify(submitRecord);
    if (valuesKey !== prevValuesRef.current) {
      prevValuesRef.current = valuesKey;
      onFormReady(submitRecord);
    }
  }, [
    values,
    activeTab,
    showTabs,
    connectionValueKey,
    showSslToggle,
    isS3,
    onFormReady,
  ]);

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const connectionLabel =
    fieldLabels.connectionString ??
    (connectionFieldKind === 'apiKey' ? 'API Key' : 'Connection String');

  const isConnectionSingleLine = ['apiKey', 'sharedLink', 'fileUrl'].includes(
    connectionFieldKind,
  );

  const content = (
    <div className={cn('space-y-4', className)}>
      {isS3 ? (
        <S3FieldsGrid control={form.control} />
      ) : showTabs ? (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="bg-muted/30 text-muted-foreground mb-6 grid h-10 w-full grid-cols-2 items-center justify-center rounded-md p-1">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Database className="size-3.5" />
              Parameters
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <LinkIcon className="size-3.5" />
              {connectionFieldKind === 'apiKey' ? 'Key' : 'String'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 outline-none">
            <DetailsFieldsGrid
              control={form.control}
              fieldLabels={fieldLabels}
              placeholders={placeholders}
              showSslToggle={showSslToggle}
            />
          </TabsContent>

          <TabsContent value="connection" className="mt-0 outline-none">
            <FormField
              control={form.control}
              name={connectionValueKey}
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className={LABEL_CLASS}>
                    {connectionLabel}
                  </FormLabel>
                  <FormControl>
                    {isConnectionSingleLine ? (
                      <Input
                        type={
                          connectionFieldKind === 'apiKey' ? 'password' : 'text'
                        }
                        {...field}
                        value={
                          typeof field.value === 'string' ? field.value : ''
                        }
                        placeholder={placeholders.connectionString}
                        autoComplete="off"
                        className="bg-background/50"
                      />
                    ) : (
                      <Textarea
                        {...field}
                        value={
                          typeof field.value === 'string' ? field.value : ''
                        }
                        placeholder={placeholders.connectionString}
                        className="bg-background/50 min-h-[140px] resize-none font-mono text-sm"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
      ) : showConnectionStringTab ? (
        <FormField
          control={form.control}
          name={connectionValueKey}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className={LABEL_CLASS}>{connectionLabel}</FormLabel>
              <FormControl>
                {isConnectionSingleLine ? (
                  <Input
                    type={
                      connectionFieldKind === 'apiKey' ? 'password' : 'text'
                    }
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={placeholders.connectionString}
                    autoComplete="off"
                    className="bg-background/50"
                  />
                ) : (
                  <Textarea
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={placeholders.connectionString}
                    className="bg-background/50 min-h-[140px] font-mono text-sm"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : showConnectionStringTab ? (
        <FormField
          control={form.control}
          name={connectionValueKey}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className={LABEL_CLASS}>{connectionLabel}</FormLabel>
              <FormControl>
                {isConnectionSingleLine ? (
                  <Input
                    type={
                      connectionFieldKind === 'apiKey' ? 'password' : 'text'
                    }
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={placeholders.connectionString}
                    autoComplete="off"
                    className="bg-background/50"
                  />
                ) : (
                  <Textarea
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={placeholders.connectionString}
                    className="bg-background/50 min-h-[140px] font-mono text-sm"
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <DetailsFieldsGrid
          control={form.control}
          fieldLabels={fieldLabels}
          placeholders={placeholders}
          showSslToggle={showSslToggle}
        />
      )}
    </div>
  );

  return <Form {...form}>{content}</Form>;
}
