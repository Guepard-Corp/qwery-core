import {
  type KeyboardEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate, useParams } from 'react-router';

import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Datasource, DatasourceKind } from '@qwery/domain/entities';
import { GetProjectBySlugService } from '@qwery/domain/services';
import { getDiscoveredDatasource } from '@qwery/extensions-sdk';
import { FormRenderer } from '@qwery/ui/form-renderer';
import { Button } from '@qwery/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@qwery/ui/card';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { generateRandomName } from '~/lib/names';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { DATASOURCES } from '~/lib/datasources-loader';

import type { Route } from './+types/new';

export async function loader({ params }: Route.LoaderArgs) {
  const extension = DATASOURCES.find((ds) => ds.id === params.id);

  if (!extension) {
    throw new Response('Extension not found', { status: 404 });
  }

  // Return only metadata - schema will be loaded on client
  // Zod schemas cannot be serialized through React Router
  return {
    extensionId: extension.id,
    name: extension.name,
    logo: extension.logo,
    description: extension.description,
  };
}

export default function DatasourcesPage({ loaderData }: Route.ComponentProps) {
  const { extensionId } = loaderData;
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;
  const { t } = useTranslation('datasources');
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
  const datasourceRepository = repositories.datasource;
  const projectRepository = repositories.project;

  const extension = useGetExtension(extensionId);
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

  // Reset form values and generate new name when extension changes
  useEffect(() => {
    startTransition(() => {
      setFormValues(null);
      setDatasourceName(generateRandomName());
    });
  }, [extensionId]);

  // Focus input when editing starts
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
      <div>
        <Trans i18nKey="datasources:loading" />
      </div>
    );
  }

  if (!extension) {
    return (
      <div>
        <Trans i18nKey="datasources:notFound" />
      </div>
    );
  }

  const provider = extension.data?.id;

  // Helper: Validate provider config
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
      if (!config.bucket) {
        return 'Please provide an S3 bucket name';
      }
      if (!config.region) {
        return 'Please provide an S3 region';
      }
      if (!config.aws_access_key_id || !config.aws_secret_access_key) {
        return 'Please provide AWS access key ID and secret access key';
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

  // Helper: Normalize provider config
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
        aws_access_key_id: config.aws_access_key_id,
        aws_secret_access_key: config.aws_secret_access_key,
        region: config.region,
        endpoint_url: config.endpoint_url,
        bucket: config.bucket,
        prefix: config.prefix,
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
    // For other providers with oneOf schemas
    if (config.connectionUrl) {
      return { connectionUrl: config.connectionUrl };
    }
    // Using separate fields - remove connectionUrl and empty fields (but keep password even if empty)
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

  // Helper: Check if form is valid for provider
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
      return !!(
        values.bucket &&
        values.region &&
        values.aws_access_key_id &&
        values.aws_secret_access_key
      );
    }
    if (
      provider === 'duckdb' ||
      provider === 'duckdb-wasm' ||
      provider === 'pglite'
    ) {
      return true; // Always enabled - database field is optional with defaults
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
      const getProjectBySlugService = new GetProjectBySlugService(
        projectRepository,
      );
      try {
        const project = await getProjectBySlugService.execute(project_id);
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

    // Infer datasource_kind from extension driver runtime
    const dsMeta = await getDiscoveredDatasource(extension.data.id);
    const driver =
      dsMeta?.drivers.find(
        (d) => d.id === (config as { driverId?: string })?.driverId,
      ) ?? dsMeta?.drivers[0];
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

  return (
    <div className="p-2 lg:p-4">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            {(extension.data?.logo || loaderData.logo) && (
              <img
                src={extension.data?.logo || loaderData.logo}
                alt={extension.data?.name || loaderData.name}
                className="h-12 w-12 rounded object-contain"
              />
            )}
            <div>
              <CardTitle>
                <Trans
                  i18nKey="datasources:new_pageTitle"
                  values={{ name: loaderData.name || extension.data?.name }}
                />
              </CardTitle>
              {(loaderData.description || extension.data?.description) && (
                <CardDescription>
                  {loaderData.description || extension.data?.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Editable Datasource Name */}
          <div className="border-border mb-6 border-b pb-6">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              <Trans i18nKey="datasources:nameLabel" />
            </label>
            <div
              className="flex items-center gap-2"
              onMouseEnter={() => setIsHoveringName(true)}
              onMouseLeave={() => setIsHoveringName(false)}
            >
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={datasourceName}
                  onChange={(e) => setDatasourceName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  className="flex-1"
                />
              ) : (
                <div className="group flex flex-1 items-center gap-2">
                  <span className="text-base font-medium">
                    {datasourceName}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 transition-opacity ${isHoveringName ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsEditingName(true)}
                    aria-label={t('editNameAriaLabel')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {extension.data?.schema && (
            <FormRenderer
              schema={extension.data.schema}
              onSubmit={handleSubmit}
              formId="datasource-form"
              onFormReady={setFormValues}
              onValidityChange={setIsFormValid}
            />
          )}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={
                testConnectionMutation.isPending ||
                createDatasourceMutation.isPending ||
                !formValues ||
                !isFormValidForProvider(formValues)
              }
            >
              {testConnectionMutation.isPending ? (
                <Trans i18nKey="datasources:testing" />
              ) : (
                <Trans i18nKey="datasources:testConnection" />
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    createPath(pathsConfig.app.projectDatasources, project_id),
                  )
                }
                disabled={
                  createDatasourceMutation.isPending ||
                  testConnectionMutation.isPending
                }
              >
                <Trans i18nKey="datasources:cancel" />
              </Button>
              <Button
                type="submit"
                form="datasource-form"
                disabled={
                  createDatasourceMutation.isPending ||
                  testConnectionMutation.isPending ||
                  (provider === 'duckdb' ||
                  provider === 'duckdb-wasm' ||
                  provider === 'pglite'
                    ? false
                    : !isFormValid ||
                      !formValues ||
                      !isFormValidForProvider(formValues))
                }
              >
                {createDatasourceMutation.isPending ? (
                  <Trans i18nKey="datasources:connecting" />
                ) : (
                  <Trans i18nKey="datasources:connect" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
