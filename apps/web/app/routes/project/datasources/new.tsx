import {
  type KeyboardEvent,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate, useParams, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import { Pencil, X, Loader2, Zap, ArrowLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Datasource, DatasourceKind } from '@qwery/domain/entities';
import { DatasourceExtension } from '@qwery/extensions-sdk';
import { FormRenderer } from '@qwery/ui/form-renderer';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useDatasourceAddedFlash } from '~/lib/context/datasource-added-flash-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { generateRandomName } from '~/lib/names';
import { useExtensionSchema } from '~/lib/queries/use-extension-schema';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { resolveDriverOrThrow } from '~/lib/utils/datasource-driver';
import { getUrlForValidation } from '~/lib/utils/datasource-utils';
import {
  validateUrlStructure,
  type DataUrlFormat,
} from '~/lib/utils/validate-datasource-url-structure';
import {
  getProjectBySlugKey,
  getProjectBySlugQueryFn,
} from '~/lib/queries/use-get-projects';
import { DATASOURCES } from '~/lib/loaders/datasource-loader';
import { getErrorKey } from '~/lib/utils/error-key';
import {
  hasLegacyFormRule,
  normalizeProviderConfig,
  validateProviderConfigWithZod,
} from '~/lib/utils/datasource-form-config';
import { getLogger } from '@qwery/shared/logger';
import { DatasourceConnectionFields } from '../_components/datasource-connection-fields';
import { DatasourceS3Fields } from '../_components/datasource-s3-fields';

import type { Route } from './+types/new';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
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
  const { t, i18n } = useTranslation(['datasources', 'common']);
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
  const { triggerDatasourceBadge } = useDatasourceAddedFlash() ?? {};
  const datasourceRepository = repositories.datasource;

  const extension = useGetExtension(extensionId);
  const extensionSchema = useExtensionSchema(extensionId);
  const [formValid, setFormValid] = useState(false);

  const testConnectionMutation = useTestConnection(
    (result) => {
      if (result.success && result.data?.connected) {
        toast.success(<Trans i18nKey="datasources:connectionTestSuccess" />);
      } else {
        toast.error(
          result.error
            ? getErrorKey(new Error(result.error), t)
            : i18n.t('datasources:connectionTestFailed'),
        );
      }
    },
    (error) => {
      toast.error(getErrorKey(error, t));
    },
  );

  const createDatasourceMutation = useCreateDatasource(
    datasourceRepository,
    (_datasource) => {
      toast.success(<Trans i18nKey="datasources:saveSuccess" />);
      triggerDatasourceBadge?.();
      navigate(createPath(pathsConfig.app.projectDatasources, project_id), {
        replace: true,
      });
    },
    (error) => {
      toast.error(getErrorKey(error, t));
      void getLogger().then((logger) =>
        logger.error('Create datasource failed', { error }),
      );
    },
  );

  const isMutationPending =
    createDatasourceMutation.isPending || testConnectionMutation.isPending;

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

  const handleNameSave = useCallback(() => {
    if (datasourceName.trim()) {
      setIsEditingName(false);
    } else {
      setDatasourceName(generateRandomName());
      setIsEditingName(false);
    }
  }, [datasourceName]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameSave();
      } else if (e.key === 'Escape') {
        setDatasourceName(generateRandomName());
        setIsEditingName(false);
      }
    },
    [handleNameSave],
  );

  const getValidConfig = useCallback(
    (
      values: Record<string, unknown>,
    ):
      | { success: true; config: Record<string, unknown> }
      | { success: false; error: string } => {
      if (hasLegacyFormRule(extensionId)) {
        const result = validateProviderConfigWithZod(values, extensionId);
        if (result.success) {
          return {
            success: true,
            config: normalizeProviderConfig(result.data, extensionId),
          };
        }
        return { success: false, error: result.error };
      }
      const schema = extensionSchema.data;
      if (schema) {
        const parsed = schema.safeParse(values);
        if (parsed.success && parsed.data) {
          return {
            success: true,
            config: parsed.data as Record<string, unknown>,
          };
        }
        const msg =
          parsed.error?.issues?.[0]?.message ?? 'Invalid configuration';
        return { success: false, error: msg };
      }
      return { success: false, error: 'No schema available' };
    },
    [extensionId, extensionSchema.data],
  );

  const handleSubmit = useCallback(
    async (values: unknown) => {
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
          toast.error(getErrorKey(error, t));
          return;
        }
      }

      if (!projectId) {
        toast.error('Unable to resolve project context for datasource');
        return;
      }

      const valuesRecord = values as Record<string, unknown>;
      const userId = workspace.userId;

      const validated = getValidConfig(valuesRecord);
      if (!validated.success) {
        toast.error(validated.error);
        return;
      }
      const config = validated.config;
      const meta = extension.data;
      if (
        meta?.previewUrlKind === 'data-file' &&
        (meta?.previewDataFormat === 'json' ||
          meta?.previewDataFormat === 'csv' ||
          meta?.previewDataFormat === 'parquet')
      ) {
        const url = getUrlForValidation(config, meta);
        if (url) {
          const structureResult = await validateUrlStructure(
            url,
            meta.previewDataFormat as DataUrlFormat,
          );
          if (!structureResult.valid) {
            toast.error(structureResult.error ?? 'URL format does not match');
            return;
          }
        }
      }

      const dsMeta = extension.data as DatasourceExtension | undefined;
      if (!dsMeta) {
        toast.error(<Trans i18nKey="datasources:notFoundError" />);
        return;
      }

      let driver;
      try {
        driver = resolveDriverOrThrow(dsMeta, { config });
      } catch {
        toast.error(<Trans i18nKey="datasources:notFoundError" />);
        return;
      }

      const datasourceKind =
        driver.runtime === 'browser'
          ? DatasourceKind.EMBEDDED
          : DatasourceKind.REMOTE;

      createDatasourceMutation.mutate({
        projectId,
        name: datasourceName.trim() || generateRandomName(),
        description: extension.data.description || '',
        datasource_provider: extension.data.id || '',
        datasource_driver: driver.id,
        datasource_kind: datasourceKind,
        config,
        createdBy: userId,
      });
    },
    [
      extension.data,
      workspace.projectId,
      workspace.userId,
      queryClient,
      project_id,
      repositories.project,
      getValidConfig,
      createDatasourceMutation,
      datasourceName,
      t,
    ],
  );

  const handleFormReady = useCallback(
    (v: unknown) => setFormValues(v as Record<string, unknown> | null),
    [],
  );

  const handleTestConnection = useCallback(async () => {
    if (!extension?.data) return;

    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }

    const validated = getValidConfig(formValues);
    if (!validated.success) {
      toast.error(validated.error);
      return;
    }
    const normalizedConfig = validated.config;
    const meta = extension.data;
    if (
      meta?.previewUrlKind === 'data-file' &&
      (meta?.previewDataFormat === 'json' ||
        meta?.previewDataFormat === 'csv' ||
        meta?.previewDataFormat === 'parquet')
    ) {
      const url = getUrlForValidation(normalizedConfig, meta);
      if (url) {
        const structureResult = await validateUrlStructure(
          url,
          meta.previewDataFormat as DataUrlFormat,
        );
        if (!structureResult.valid) {
          toast.error(structureResult.error ?? 'URL format does not match');
          return;
        }
      }
    }

    const dsMeta = extension.data as DatasourceExtension | undefined;
    if (!dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }

    let driver;
    try {
      driver = resolveDriverOrThrow(dsMeta, { config: normalizedConfig });
    } catch {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }

    const datasourceKind =
      driver.runtime === 'browser'
        ? DatasourceKind.EMBEDDED
        : DatasourceKind.REMOTE;

    const testDatasource: Partial<Datasource> = {
      datasource_provider: extension.data.id,
      datasource_driver: driver.id,
      datasource_kind: datasourceKind,
      name: datasourceName || 'Test Connection',
      config: normalizedConfig,
    };

    testConnectionMutation.mutate(testDatasource as Datasource);
  }, [
    extension.data,
    formValues,
    getValidConfig,
    datasourceName,
    testConnectionMutation,
  ]);

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

  const isTestConnectionDisabled = isMutationPending || !formValid;
  const isSubmitDisabled = isMutationPending || !formValid;

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
                <DatasourceS3Fields
                  formId="datasource-form"
                  onFormReady={handleFormReady}
                  onValidityChange={setFormValid}
                  onSubmit={handleSubmit}
                />
              ) : hasLegacyFormRule(extensionId) ? (
                <DatasourceConnectionFields
                  extensionId={extensionId}
                  onFormReady={handleFormReady}
                  onValidityChange={setFormValid}
                  _formId="datasource-form"
                />
              ) : extensionSchema.data ? (
                <FormRenderer
                  schema={extensionSchema.data}
                  onSubmit={handleSubmit}
                  formId="datasource-form"
                  locale={i18n.resolvedLanguage}
                  onFormReady={handleFormReady}
                  onValidityChange={setFormValid}
                />
              ) : extensionSchema.isLoading ? (
                <div className="py-8" />
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
