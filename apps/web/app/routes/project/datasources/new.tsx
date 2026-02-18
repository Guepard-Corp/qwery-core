import {
  type KeyboardEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate, useParams, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import {
  Pencil,
  X,
  Database,
  Loader2,
  Zap,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Datasource, DatasourceKind } from '@qwery/domain/entities';
import { DatasourceExtension } from '@qwery/extensions-sdk';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { FormRenderer } from '@qwery/ui/form-renderer';
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
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';
import { z } from 'zod';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { generateRandomName } from '~/lib/names';
import { useExtensionSchema } from '~/lib/queries/use-extension-schema';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import {
  getProjectBySlugKey,
  getProjectBySlugQueryFn,
} from '~/lib/queries/use-get-projects';
import { DATASOURCES } from '~/lib/loaders/datasource-loader';

import type { Route } from './+types/new';

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

const s3FormSchema = z
  .object({
    provider: z.enum(['aws', 'digitalocean', 'minio', 'other']),
    endpoint_url: z.string().optional(),
    aws_access_key_id: z.string().min(1, 'Required'),
    aws_secret_access_key: z.string().min(1, 'Required'),
    aws_session_token: z.string().optional(),
    region: z.string().min(1, 'Required'),
    bucket: z.string().min(1, 'Required'),
    prefix: z.string().optional(),
    format: z.enum(['parquet', 'json']),
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.provider === 'aws' ||
      (data.endpoint_url && data.endpoint_url.trim().length > 0) ||
      (data.provider === 'digitalocean' && data.region?.trim().length > 0),
    {
      message:
        'Endpoint URL required for non-AWS, or set region for DigitalOcean Spaces',
      path: ['endpoint_url'],
    },
  );

type S3FormValues = z.infer<typeof s3FormSchema>;

function S3DatasourceForm({
  onSubmit,
  formId,
  onFormReady,
  onValidityChange,
}: {
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  formId: string;
  onFormReady: (values: Record<string, unknown>) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const defaultValues: S3FormValues = {
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

  const form = useForm<S3FormValues>({
    resolver: zodResolver(s3FormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watched = useWatch({ control: form.control });
  const provider = (watched?.provider as string) ?? 'aws';
  const showEndpoint = provider !== 'aws';
  const isDigitalOcean = provider === 'digitalocean';

  useEffect(() => {
    onFormReady((watched ?? form.getValues()) as Record<string, unknown>);
  }, [watched, onFormReady, form]);

  useEffect(() => {
    onValidityChange(form.formState.isValid);
  }, [form.formState.isValid, form.formState.errors, onValidityChange]);

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((v) =>
          onSubmit(v as Record<string, unknown>),
        )}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                Provider
              </FormLabel>
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
              <FormItem>
                <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
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
                    className="bg-background/50"
                  />
                </FormControl>
                <FormDescription className="text-muted-foreground text-xs">
                  {isDigitalOcean &&
                    'Leave empty to derive from region (https://<region>.digitaloceanspaces.com)'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bucket"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                  {isDigitalOcean ? 'Space name' : 'Bucket'}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={isDigitalOcean ? 'qwery' : 'my-bucket'}
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
              <FormItem>
                <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                  {isDigitalOcean ? 'Spaces region' : 'Region'}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    placeholder={isDigitalOcean ? 'fra1' : 'us-east-1'}
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
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                {isDigitalOcean ? 'Spaces Access Key ID' : 'Access Key ID'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  type="text"
                  autoComplete="off"
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
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                {isDigitalOcean ? 'Spaces Secret Key' : 'Secret Access Key'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Secret key"
                  className="bg-background/50"
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
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                Prefix (optional)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={typeof field.value === 'string' ? field.value : ''}
                  placeholder="folder/ or leave empty"
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
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
                File format
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={
                  typeof field.value === 'string' ? field.value : 'parquet'
                }
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
            <FormItem>
              <FormLabel className="text-[13px] font-bold tracking-wider uppercase">
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
      </form>
    </Form>
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  const extension = DATASOURCES.find((ds) => ds.id === params.id);

  if (!extension) {
    throw new Response('Extension not found', { status: 404 });
  }

  return {
    extensionId: extension.id,
    name: extension.name,
    icon: extension.icon,
    description: extension.description,
  };
}

export default function DatasourcesPage({ loaderData }: Route.ComponentProps) {
  const { extensionId } = loaderData;
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;
  const { t, i18n } = useTranslation('datasources');
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [datasourceName, setDatasourceName] = useState(() =>
    generateRandomName(),
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { repositories, workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const datasourceRepository = repositories.datasource;
  const projectRepository = repositories.project;

  const extension = useGetExtension(extensionId);
  const extensionSchema = useExtensionSchema(extensionId);
  const [isFormValid, setIsFormValid] = useState(false);

  const testConnectionMutation = useTestConnection(
    (result) => {
      if (result.success && result.data?.connected) {
        toast.success(<Trans i18nKey="datasources:connectionTestSuccess" />);
      } else {
        toast.error(
          result.error || <Trans i18nKey="datasources:connectionTestFailed" />,
        );
      }
    },
    (error) => {
      toast.error(
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:connectionTestError" />
        ),
      );
    },
  );

  const createDatasourceMutation = useCreateDatasource(
    datasourceRepository,
    (_datasource) => {
      toast.success(<Trans i18nKey="datasources:saveSuccess" />);
      navigate(createPath(pathsConfig.app.projectDatasources, project_id), {
        replace: true,
      });
    },
    (error) => {
      const errorMessage =
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:saveFailed" />
        );
      toast.error(errorMessage);
      console.error(error);
    },
  );

  const isMutationPending =
    createDatasourceMutation.isPending || testConnectionMutation.isPending;
  const isTestConnectionDisabled =
    isMutationPending || !formValues || !isFormValidForProvider(formValues);
  const isSubmitDisabled = isMutationPending || !canSubmit;

  useEffect(() => {
    startTransition(() => {
      setFormValues(null);
      setDatasourceName(generateRandomName());
    });
  }, [extensionId]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    if (datasourceName.trim()) {
      setIsEditingName(false);
    } else {
      setDatasourceName(generateRandomName());
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      setDatasourceName(generateRandomName());
      setIsEditingName(false);
    }
  };

  if (extension.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="datasources:loading" />
          </p>
        </div>
      </div>
    );
  }

  if (!extension) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Database className="text-muted-foreground/50 h-12 w-12" />
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="datasources:notFound" />
          </p>
        </div>
      </div>
    );
  }

  const provider = extension.data?.id;

  const validateProviderConfig = (
    config: Record<string, unknown>,
  ): string | null => {
    if (!provider) return 'Extension provider not found';
    if (provider === 'gsheet-csv') {
      if (!(config.sharedLink || config.url)) {
        return 'Please provide a Google Sheets shared link';
      }
    } else if (provider === 'json-online') {
      if (!(config.jsonUrl || config.url || config.connectionUrl)) {
        return 'Please provide a JSON file URL (jsonUrl, url, or connectionUrl)';
      }
    } else if (provider === 'parquet-online') {
      if (!(config.url || config.connectionUrl)) {
        return 'Please provide a Parquet file URL (url or connectionUrl)';
      }
    } else if (provider === 's3') {
      if (!config.bucket) return 'Please provide an S3 bucket name';
      if (!config.region) return 'Please provide an S3 region';
      if (!config.aws_access_key_id || !config.aws_secret_access_key) {
        return 'Please provide access key ID and secret access key';
      }
      if (
        !config.format ||
        !['parquet', 'json'].includes(config.format as string)
      ) {
        return 'Please select file format (Parquet or JSON)';
      }
      const s3Provider = config.provider as string | undefined;
      if (
        s3Provider &&
        s3Provider !== 'aws' &&
        !config.endpoint_url &&
        !(s3Provider === 'digitalocean' && config.region)
      ) {
        return 'Endpoint URL required for MinIO/Other, or set region for DigitalOcean Spaces';
      }
    } else if (
      provider !== 'duckdb' &&
      provider !== 'duckdb-wasm' &&
      provider !== 'pglite'
    ) {
      if (!(config.connectionUrl || config.host)) {
        return 'Please provide either a connection URL or connection details (host is required)';
      }
    }
    return null;
  };

  const normalizeProviderConfig = (
    config: Record<string, unknown>,
  ): Record<string, unknown> => {
    if (!provider) return config;
    if (provider === 'gsheet-csv') {
      return { sharedLink: config.sharedLink || config.url };
    }
    if (provider === 'json-online') {
      return { jsonUrl: config.jsonUrl || config.url || config.connectionUrl };
    }
    if (provider === 'parquet-online') {
      return { url: config.url || config.connectionUrl };
    }
    if (provider === 's3') {
      const normalized: Record<string, unknown> = {
        provider: config.provider ?? 'aws',
        aws_access_key_id: config.aws_access_key_id,
        aws_secret_access_key: config.aws_secret_access_key,
        region: config.region,
        endpoint_url: config.endpoint_url,
        bucket: config.bucket,
        prefix: config.prefix,
        format: config.format ?? 'parquet',
        includes: config.includes,
        excludes: config.excludes,
      };
      Object.keys(normalized).forEach((key) => {
        const value = normalized[key];
        if (
          value === '' ||
          value === undefined ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete normalized[key];
        }
      });
      return normalized;
    }
    if (
      provider === 'duckdb' ||
      provider === 'duckdb-wasm' ||
      provider === 'pglite'
    ) {
      return config.database ? { database: config.database } : {};
    }
    if (config.connectionUrl) {
      return { connectionUrl: config.connectionUrl };
    }
    const normalized = { ...config };
    delete normalized.connectionUrl;
    Object.keys(normalized).forEach((key) => {
      if (
        key !== 'password' &&
        (normalized[key] === '' || normalized[key] === undefined)
      ) {
        delete normalized[key];
      }
    });
    return normalized;
  };

  const isFormValidForProvider = (values: Record<string, unknown>): boolean => {
    if (!provider) return false;
    if (provider === 'gsheet-csv') {
      return !!(values.sharedLink || values.url);
    }
    if (provider === 'json-online') {
      return !!(values.jsonUrl || values.url || values.connectionUrl);
    }
    if (provider === 'parquet-online') {
      return !!(values.url || values.connectionUrl);
    }
    if (provider === 's3') {
      const hasCreds =
        values.bucket &&
        values.region &&
        values.aws_access_key_id &&
        values.aws_secret_access_key &&
        values.format;
      const providerOk =
        values.provider === 'aws' ||
        (values.provider && values.endpoint_url) ||
        (values.provider === 'digitalocean' && values.region);
      return !!(hasCreds && providerOk);
    }
    if (
      provider === 'duckdb' ||
      provider === 'duckdb-wasm' ||
      provider === 'pglite'
    ) {
      return true;
    }
    return !!(values.connectionUrl || values.host);
  };

  const handleSubmit = async (values: unknown) => {
    if (!extension?.data) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }

    let projectId = workspace.projectId;
    if (!projectId) {
      try {
        const project = await queryClient.fetchQuery({
          queryKey: getProjectBySlugKey(project_id),
          queryFn: getProjectBySlugQueryFn(repositories.project, project_id),
        });
        projectId = project.id;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to resolve project context for datasource',
        );
        return;
      }
    }

    if (!projectId) {
      toast.error('Unable to resolve project context for datasource');
      return;
    }

    let config = values as Record<string, unknown>;
    const userId = workspace.userId;

    const validationError = validateProviderConfig(config);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    config = normalizeProviderConfig(config);

    const dsMeta = extension.data as DatasourceExtension | undefined;
    if (!dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }
    const driver =
      dsMeta.drivers.find(
        (d) => d.id === (config as { driverId?: string })?.driverId,
      ) ?? dsMeta.drivers[0];
    const runtime = driver?.runtime ?? 'browser';
    const datasourceKind =
      runtime === 'browser' ? DatasourceKind.EMBEDDED : DatasourceKind.REMOTE;

    createDatasourceMutation.mutate({
      projectId,
      name: datasourceName.trim() || generateRandomName(),
      description: extension.data.description || '',
      datasource_provider: extension.data.id || '',
      datasource_driver: extension.data.id || '',
      datasource_kind: datasourceKind as string,
      config,
      createdBy: userId,
    });
  };

  const handleTestConnection = () => {
    if (!extension?.data) return;

    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }

    const validationError = validateProviderConfig(formValues);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedConfig = normalizeProviderConfig(formValues);

    const testDatasource: Partial<Datasource> = {
      datasource_provider: extension.data.id,
      datasource_driver: extension.data.id,
      datasource_kind: DatasourceKind.EMBEDDED,
      name: datasourceName || 'Test Connection',
      config: normalizedConfig,
    };

    testConnectionMutation.mutate(testDatasource as Datasource);
  };

  const canSubmit =
    provider === 'duckdb' || provider === 'duckdb-wasm' || provider === 'pglite'
      ? true
      : isFormValid && formValues && isFormValidForProvider(formValues);

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-border/40 bg-background/95 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link
            to={createPath(pathsConfig.app.availableSources, project_id)}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to datasources</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="bg-muted/50 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
              {(extension.data?.icon || loaderData.icon) && (
                <img
                  src={extension.data?.icon || loaderData.icon}
                  alt={extension.data?.name || loaderData.name}
                  className="h-9 w-9 object-contain"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-foreground text-xl font-semibold tracking-tight">
                Connect to {loaderData.name || extension.data?.name}
              </h1>
              {(loaderData.description || extension.data?.description) && (
                <p className="text-muted-foreground mt-0.5 truncate text-sm">
                  {loaderData.description || extension.data?.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div
            className={cn(
              'border-border/60 overflow-hidden rounded-xl border transition-all',
              isEditingName && 'ring-2 ring-[#ffcb51]',
            )}
          >
            <div
              className="border-border/40 bg-muted/20 border-b px-5 py-4"
              onMouseEnter={() => setIsHoveringName(true)}
              onMouseLeave={() => setIsHoveringName(false)}
            >
              <label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
                <Trans i18nKey="datasources:nameLabel" />
              </label>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <>
                    <Input
                      ref={nameInputRef}
                      value={datasourceName}
                      onChange={(e) => setDatasourceName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      className="text-foreground h-auto flex-1 border-0 bg-transparent p-0 text-lg font-medium shadow-none focus-visible:ring-0"
                      placeholder="Enter datasource name..."
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        setDatasourceName(generateRandomName());
                        setIsEditingName(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-foreground text-lg font-medium">
                      {datasourceName}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-7 w-7 transition-opacity',
                        isHoveringName ? 'opacity-100' : 'opacity-0',
                      )}
                      onClick={() => setIsEditingName(true)}
                      aria-label={t('editNameAriaLabel')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-background p-5">
              {extensionId === 's3' ? (
                <S3DatasourceForm
                  onSubmit={handleSubmit}
                  formId="datasource-form"
                  onFormReady={setFormValues}
                  onValidityChange={setIsFormValid}
                />
              ) : extensionSchema.data ? (
                <FormRenderer
                  schema={extensionSchema.data}
                  onSubmit={handleSubmit}
                  formId="datasource-form"
                  locale={i18n.resolvedLanguage}
                  onFormReady={(values) =>
                    setFormValues(values as Record<string, unknown> | null)
                  }
                  onValidityChange={setIsFormValid}
                />
              ) : extensionSchema.isLoading ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  Loading form…
                </div>
              ) : null}
            </div>

            <div className="border-border/40 bg-muted/10 flex items-center justify-between border-t px-5 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTestConnectionDisabled}
                className="text-muted-foreground hover:text-foreground h-9 gap-2"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <Trans i18nKey="datasources:testConnection" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(
                      createPath(pathsConfig.app.availableSources, project_id),
                    )
                  }
                  disabled={isMutationPending}
                  className="h-9"
                >
                  <Trans i18nKey="datasources:cancel" />
                </Button>
                <Button
                  type="submit"
                  form="datasource-form"
                  size="sm"
                  disabled={isSubmitDisabled}
                  className="h-9 gap-2 bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90"
                >
                  {createDatasourceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <Trans i18nKey="datasources:connect" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
