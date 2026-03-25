import type { Resolver } from 'react-hook-form';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { DatasourceFormConfigPayload } from '~/lib/utils/datasource-form-config';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@qwery/ui/tabs';
import { Textarea } from '@qwery/ui/textarea';
import { cn } from '@qwery/ui/utils';
import type {
  DatasourceFormPlaceholders,
  FieldLabels,
} from '~/lib/utils/datasource-form-config';
import {
  asSubmitRecord,
  DETAILS_KEYS,
  getConnectionValueKey,
  getDefaultConnectionValues,
} from '~/lib/utils/datasource-connection-fields-utils';
import { useDebouncedValue } from '~/lib/hooks/use-debounced-value';
import {
  getDatasourceFormConfig,
  getProviderZodSchema,
  DATASOURCE_INPUT_MAX_LENGTH,
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

const DetailsFieldsGrid = React.memo(function DetailsFieldsGrid({
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
                maxLength={DATASOURCE_INPUT_MAX_LENGTH.host}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.port}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.database}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.username}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.password}
                  autoComplete="off"
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
});

export function DatasourceConnectionFields({
  extensionId,
  formConfig,
  onFormReady,
  onValidityChange,
  _formId,
  className,
  defaultValues: defaultValuesProp,
}: {
  extensionId: string;
  formConfig?: DatasourceFormConfigPayload | null;
  onFormReady: (values: Record<string, unknown>) => void;
  onValidityChange: (valid: boolean) => void;
  _formId?: string;
  className?: string;
  defaultValues?: Record<string, unknown>;
}) {
  const config = useMemo(
    () => getDatasourceFormConfig(extensionId, formConfig ?? undefined),
    [extensionId, formConfig],
  );

  const connectionValueKey = getConnectionValueKey(
    config.connectionFieldKind,
    formConfig ?? undefined,
    extensionId,
  );

  const schema = useMemo(
    () => getProviderZodSchema(extensionId, formConfig ?? undefined),
    [extensionId, formConfig],
  );

  const providerResolver: Resolver<Record<string, unknown>> = useCallback(
    (values) => {
      const result = schema.safeParse(values);
      if (result.success) return { values: result.data, errors: {} };
      const errors: Record<string, { type: string; message: string }> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        errors[path] = { type: 'custom', message: issue.message };
      }
      const firstMessage = result.error.issues[0]?.message;
      if (firstMessage)
        errors._root = { type: 'custom', message: firstMessage };
      return { values, errors } as ReturnType<
        Resolver<Record<string, unknown>>
      >;
    },
    [schema],
  );

  const form = useForm<Record<string, unknown>>({
    defaultValues: {
      ...getDefaultConnectionValues(),
      ...(config.showSslToggle ? { ssl: false } : {}),
      ...(defaultValuesProp ?? {}),
    } as Record<string, unknown>,
    resolver: providerResolver,
    mode: 'onTouched',
  });

  const [activeTab, setActiveTab] = useState<string>(
    config.showDetailsTab ? 'details' : 'connection',
  );

  const values = useWatch({ control: form.control });
  const isValid = useMemo(
    () =>
      schema.safeParse((values ?? form.getValues()) as Record<string, unknown>)
        .success,
    [schema, values, form],
  );

  const hostValue = useWatch({ control: form.control, name: 'host' });
  useEffect(() => {
    if (config.showDetailsTab && hostValue !== undefined) {
      form.trigger('host');
    }
  }, [hostValue, config.showDetailsTab, form]);

  const connectionStringValue = useWatch({
    control: form.control,
    name: connectionValueKey,
  });
  const debouncedConnectionString = useDebouncedValue(
    typeof connectionStringValue === 'string' ? connectionStringValue : '',
    400,
  );

  useEffect(() => {
    if (
      activeTab === 'connection' &&
      debouncedConnectionString.trim() &&
      config.showDetailsTab
    ) {
      const parsed = parseConnectionString(
        debouncedConnectionString,
        extensionId,
      );
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
    debouncedConnectionString,
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

  const prevValuesRef = useRef<string>('');
  useEffect(() => {
    const currentValues = values ?? {};

    let submitRecord: Record<string, unknown>;
    if (activeTab === 'connection' && showTabs) {
      submitRecord = asSubmitRecord({
        [connectionValueKey]: currentValues[connectionValueKey],
      });
    } else if (activeTab === 'details' && showTabs) {
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
    onFormReady,
  ]);

  const lastValidRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastValidRef.current === isValid) return;
    lastValidRef.current = isValid;
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const connectionLabel =
    fieldLabels.connectionString ??
    (connectionFieldKind === 'apiKey' ? 'API Key' : 'Connection String');

  const rootError = form.formState.errors._root?.message as string | undefined;
  const { submitCount, touchedFields } = form.formState;
  const showRootError =
    !!rootError && (submitCount > 0 || Object.keys(touchedFields).length > 0);

  const content = (
    <div className={cn('space-y-4', className)}>
      {showTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    <Textarea
                      {...field}
                      value={typeof field.value === 'string' ? field.value : ''}
                      placeholder={placeholders.connectionString}
                      maxLength={DATASOURCE_INPUT_MAX_LENGTH.connectionString}
                      autoComplete="off"
                      className="bg-background/50 min-h-[140px] resize-none font-mono text-sm"
                    />
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
                <Textarea
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder={placeholders.connectionString}
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.connectionString}
                  autoComplete="off"
                  className="bg-background/50 min-h-[140px] resize-none font-mono text-sm"
                />
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
      {showRootError ? (
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10 rounded-r-md border-l-4 px-3 py-2.5 text-sm font-medium dark:text-red-400"
          role="alert"
        >
          {rootError}
        </p>
      ) : null}
    </div>
  );

  return <Form {...form}>{content}</Form>;
}
