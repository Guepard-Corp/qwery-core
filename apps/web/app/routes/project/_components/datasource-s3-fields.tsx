import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DATASOURCE_INPUT_MAX_LENGTH,
  S3_FORM_SCHEMA,
} from '~/lib/utils/datasource-form-config';
import { Eye, EyeOff } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { cn } from '@qwery/ui/utils';

const LABEL_CLASS =
  'text-[13px] font-bold uppercase tracking-[0.05em] text-foreground';

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

type S3FormValues = z.infer<typeof S3_FORM_SCHEMA>;

const defaultS3Values: S3FormValues = {
  provider: 'aws',
  format: 'parquet',
  prefix: '',
  region: '',
  bucket: '',
  aws_access_key_id: '',
  aws_secret_access_key: '',
  aws_session_token: '',
  endpoint_url: '',
  includes: [],
  excludes: [],
};

function SecretKeyInput({
  value,
  onChange,
  placeholder,
  label,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <span className={LABEL_CLASS}>{label}</span>
      <div className="group relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          className="bg-background/50 focus:bg-background pr-10 transition-colors"
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

export interface DatasourceS3FieldsProps {
  formId?: string;
  onFormReady: (values: Record<string, unknown>) => void;
  onValidityChange: (valid: boolean) => void;
  defaultValues?: Record<string, unknown>;
  className?: string;
  onSubmit?: (values: Record<string, unknown>) => void;
}

export function DatasourceS3Fields({
  formId,
  onFormReady,
  onValidityChange,
  defaultValues,
  className,
  onSubmit,
}: DatasourceS3FieldsProps) {
  const form = useForm<S3FormValues>({
    resolver: zodResolver(S3_FORM_SCHEMA),
    defaultValues: {
      ...defaultS3Values,
      ...(defaultValues as Partial<S3FormValues> | undefined),
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.trigger();
  }, [form]);

  const watched = useWatch({ control: form.control });
  const provider = (watched?.provider as string) ?? 'aws';
  const showEndpoint = provider !== 'aws';
  const isDigitalOcean = provider === 'digitalocean';
  const isValid = form.formState.isValid;

  useEffect(() => {
    const raw = (watched ?? form.getValues()) as Record<string, unknown>;
    const cleaned = Object.fromEntries(
      Object.entries(raw).filter(
        ([, v]) =>
          v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
      ),
    );
    onFormReady(cleaned);
  }, [watched, onFormReady, form]);

  const lastValidRef = React.useRef<boolean | null>(null);
  useEffect(() => {
    if (lastValidRef.current === isValid) return;
    lastValidRef.current = isValid;
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const handleSubmit = useCallback(
    (values: S3FormValues) => {
      onSubmit?.(values as Record<string, unknown>);
    },
    [onSubmit],
  );

  const content = (
    <div className={cn('space-y-4', className)}>
      <FormField
        control={form.control}
        name="provider"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>Provider</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={typeof field.value === 'string' ? field.value : 'aws'}
            >
              <FormControl>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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
      {showEndpoint && (
        <FormField
          control={form.control}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.endpointUrl}
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              {isDigitalOcean && (
                <FormDescription className="text-muted-foreground text-xs">
                  Leave empty to derive from region
                  (https://&lt;region&gt;.digitaloceanspaces.com)
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.bucket}
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
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
                  maxLength={DATASOURCE_INPUT_MAX_LENGTH.region}
                  autoComplete="off"
                  className="bg-background/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
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
                type="text"
                autoComplete="off"
                maxLength={DATASOURCE_INPUT_MAX_LENGTH.accessKeyId}
                placeholder="Access key"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="aws_secret_access_key"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormControl>
              <SecretKeyInput
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                placeholder="Secret key"
                maxLength={DATASOURCE_INPUT_MAX_LENGTH.secretAccessKey}
                label={
                  isDigitalOcean ? 'Spaces Secret Key' : 'Secret Access Key'
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="prefix"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>Prefix (optional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                placeholder="folder/ or leave empty"
                maxLength={DATASOURCE_INPUT_MAX_LENGTH.prefix}
                autoComplete="off"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="format"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>File format</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={typeof field.value === 'string' ? field.value : 'parquet'}
            >
              <FormControl>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Parquet or JSON" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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
        control={form.control}
        name="includes"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className={LABEL_CLASS}>
              Include pattern (optional)
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
                maxLength={DATASOURCE_INPUT_MAX_LENGTH.patternList}
                autoComplete="off"
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
                placeholder="**/*.parquet or **/*.json (first used)"
                className="bg-background/50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="contents"
        noValidate
      >
        {content}
      </form>
    </Form>
  );
}
