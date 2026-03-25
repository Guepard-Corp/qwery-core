import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { z as zLib } from 'zod';
import { Check, Loader2, Pencil, Shuffle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Datasource, DatasourceKind } from '@qwery/domain/entities';
import { GetProjectBySlugService } from '@qwery/domain/services';
import type {
  DatasourceExtension,
  ExtensionDefinition,
} from '@qwery/extensions-sdk';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { useDeleteDatasource } from '~/lib/mutations/use-delete-datasource';
import { useUpdateDatasource } from '~/lib/mutations/use-update-datasource';
import { generateRandomName } from '~/lib/names';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { useExtensionSchema } from '~/lib/queries/use-extension-schema';
import { FormRenderer } from '@qwery/ui/form-renderer';
import {
  getUrlForValidation,
  validateDatasourceUrl,
  isGsheetLikeUrl,
} from '~/lib/utils/datasource-utils';
import {
  hasLegacyFormRule,
  getDocsUrl,
  DATASOURCE_INPUT_MAX_LENGTH,
} from '~/lib/utils/datasource-form-config';
import { getLogger } from '@qwery/shared/logger';
import { useDatasourceAddedFlash } from '~/lib/context/datasource-added-flash-context';
import { resolveDriverOrThrow } from '~/lib/utils/datasource-driver';
import { DatasourceDocsLink } from './datasource-docs-link';
import { DatasourceConnectionFields } from './datasource-connection-fields';
import { DatasourceS3Fields } from './datasource-s3-fields';
import { expandStoredConfigForFormDefaults } from '~/lib/utils/datasource-connection-fields-utils';
import { ERROR_KEYS, getErrorKey } from '~/lib/utils/error-key';
import { shouldInvertDatasourceIcon } from '@qwery/shared/utils';
import { ZodErrorVisualizer } from '@qwery/ui/qwery/datasource';
import { ZodError } from 'zod';
import { validateDatasourceConfigPipeline } from '~/lib/utils/datasource-config-pipeline';

interface DatasourceFormActionsProps {
  onCancel: () => void;
  onTestConnection: () => void;
  onSubmit: () => void;
  isActionDisabled: boolean;
  isTestConnectionDisabled: boolean;
  isSubmitDisabled: boolean;
  isPending: boolean;
  isConnecting: boolean;
  existingDatasource: Datasource | undefined;
  onDeleteClick: () => void;
}

const DatasourceFormActions = React.memo(function DatasourceFormActions({
  onCancel,
  onTestConnection,
  onSubmit,
  isActionDisabled,
  isTestConnectionDisabled,
  isSubmitDisabled,
  isPending,
  isConnecting,
  existingDatasource,
  onDeleteClick,
}: DatasourceFormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={isActionDisabled}
        className="text-muted-foreground hover:text-foreground hover:bg-transparent"
      >
        <Trans i18nKey="datasources:cancel" />
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row">
        {existingDatasource && (
          <Button
            variant="destructive"
            onClick={onDeleteClick}
            disabled={isActionDisabled}
            data-test="datasource-delete-button"
          >
            <Trans i18nKey="datasources:deleteButton" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onTestConnection}
          disabled={isTestConnectionDisabled}
          className="border-border border bg-white font-semibold text-black shadow-sm transition-all hover:bg-gray-50 hover:text-black"
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          <Trans i18nKey="datasources:testConnection" />
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="border-0 bg-yellow-400 font-bold text-black shadow-lg transition-all hover:bg-yellow-500"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Check className="mr-2 size-4" />
          )}
          {existingDatasource ? (
            isConnecting ? (
              <Trans i18nKey="datasources:updating" />
            ) : (
              <Trans i18nKey="datasources:update" />
            )
          ) : (
            <Trans i18nKey="datasources:connect" />
          )}
        </Button>
      </div>
    </div>
  );
});

export interface DatasourceConnectFormProps {
  extensionId: string;
  projectSlug: string;
  extensionMeta: ExtensionDefinition;
  onSuccess: () => void;
  onCancel: () => void;
  formId?: string;
  showHeader?: boolean;
  className?: string;
  variant?: 'default' | 'sheet';
  actionsContainerRef?: React.RefObject<HTMLDivElement | null>;
  actionsContainerReady?: boolean;
  datasourceName?: string;
  onDatasourceNameChange?: (name: string) => void;
  onFormValuesChange?: (values: Record<string, unknown> | null) => void;
  onFormValidityChange?: (valid: boolean) => void;
  onTestConnectionLoadingChange?: (isLoading: boolean) => void;
  existingDatasource?: Datasource;
  onSwitchToGsheet?: (sharedLink: string) => void;
  initialFormValues?: Record<string, unknown>;
}

export function DatasourceConnectForm({
  extensionId,
  projectSlug,
  extensionMeta,
  onSuccess,
  onCancel,
  formId,
  showHeader = true,
  className,
  variant = 'default',
  actionsContainerRef,
  actionsContainerReady,
  datasourceName: controlledName,
  onDatasourceNameChange,
  onFormValuesChange,
  onFormValidityChange,
  onTestConnectionLoadingChange,
  existingDatasource,
  onSwitchToGsheet,
  initialFormValues,
}: DatasourceConnectFormProps) {
  const [internalName, setInternalName] = useState(
    () => existingDatasource?.name ?? generateRandomName(),
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const nameSnapshotRef = useRef('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [schemaValid, setSchemaValid] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);
  const [validationError, setValidationError] = useState<ZodError | null>(null);

  const urlValidation = useMemo(() => {
    if (!extensionMeta?.supportsPreview) {
      return {
        valid: true,
        error: null as string | null,
        gsheetHintUrl: null as string | null,
      };
    }

    const url = getUrlForValidation(formValues, extensionMeta);

    // Special case: CSV Online with a Google Sheets link -> soft hint, not a hard error
    if (extensionId === 'csv-online' && url && isGsheetLikeUrl(url)) {
      return {
        valid: true,
        error: null,
        gsheetHintUrl: url,
      };
    }

    if (
      extensionMeta.previewUrlKind !== 'embeddable' &&
      extensionMeta.previewUrlKind !== 'data-file'
    ) {
      return {
        valid: true,
        error: null as string | null,
        gsheetHintUrl: null as string | null,
      };
    }

    const result = validateDatasourceUrl(extensionMeta, url);
    return {
      valid: result.isValid,
      error: result.error,
      gsheetHintUrl: null as string | null,
    };
  }, [formValues, extensionMeta, extensionId]);

  const isFormValid = schemaValid && urlValidation.valid;

  const lastFormValidRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!onFormValidityChange) return;
    if (lastFormValidRef.current === isFormValid) return;
    lastFormValidRef.current = isFormValid;
    onFormValidityChange(isFormValid);
  }, [isFormValid, onFormValidityChange]);

  useEffect(() => {
    if (
      variant === 'sheet' &&
      actionsContainerReady &&
      actionsContainerRef?.current
    ) {
      setPortalTarget(actionsContainerRef.current);
    } else {
      setPortalTarget(null);
    }
  }, [variant, actionsContainerReady, actionsContainerRef]);

  const { t, i18n } = useTranslation('common');
  const { repositories, workspace } = useWorkspace();
  const datasourceRepository = repositories.datasource;
  const projectRepository = repositories.project;
  const extension = useGetExtension(extensionId);
  const extensionSchema = useExtensionSchema(extensionId);
  const usePresetForm = hasLegacyFormRule(extensionId);
  const docsUrl = extension.data?.docsUrl ?? getDocsUrl(extensionId, undefined);

  /** Fallback when extension has no schema (e.g. 404 on schema.js). FormRenderer only when !usePresetForm. */
  const fallbackSchema = useMemo(
    () =>
      zLib
        .object({
          connectionUrl: zLib.string().optional(),
          connectionString: zLib.string().optional(),
        })
        .passthrough(),
    [],
  );
  const effectiveSchema = extensionSchema.data ?? fallbackSchema;

  const editFormDefaults = useMemo(
    () =>
      expandStoredConfigForFormDefaults(
        extensionId,
        (existingDatasource?.config as Record<string, unknown> | undefined) ??
          initialFormValues,
        undefined,
      ),
    [extensionId, existingDatasource?.config, initialFormValues],
  );

  const testConnectionMutation = useTestConnection(
    (result) => {
      onTestConnectionLoadingChange?.(false);
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
      onTestConnectionLoadingChange?.(false);
      toast.error(getErrorKey(error, t));
    },
  );

  const isNameControlled =
    controlledName !== undefined && onDatasourceNameChange != null;
  const datasourceName = isNameControlled ? controlledName : internalName;
  const setDatasourceName = isNameControlled
    ? onDatasourceNameChange!
    : setInternalName;

  const handleNameSave = useCallback(() => {
    const trimmed = datasourceName.trim();
    if (trimmed) setDatasourceName(trimmed);
    else setDatasourceName(generateRandomName());
    setIsEditingName(false);
  }, [datasourceName, setDatasourceName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDatasourceName(nameSnapshotRef.current);
        setIsEditingName(false);
      }
    },
    [handleNameSave, setDatasourceName],
  );

  const handleFormReady = useCallback(
    (values: Record<string, unknown>) => {
      setFormValues(values);
      onFormValuesChange?.(values);
    },
    [onFormValuesChange],
  );

  const { triggerDatasourceBadge } = useDatasourceAddedFlash() ?? {};
  const createDatasourceMutation = useCreateDatasource(
    datasourceRepository,
    (_datasource) => {
      toast.success(<Trans i18nKey="datasources:saveSuccess" />);
      triggerDatasourceBadge?.();
      setIsConnecting(false);
      onSuccess();
    },
    (error) => {
      toast.error(getErrorKey(error, t));
      void getLogger().then((logger) =>
        logger.error('Create datasource failed', { error }),
      );
      setIsConnecting(false);
    },
  );

  const updateDatasourceMutation = useUpdateDatasource(
    datasourceRepository,
    (_datasource) => {
      toast.success(<Trans i18nKey="datasources:updateSuccess" />);
      setIsConnecting(false);
      onSuccess();
    },
    (error) => {
      toast.error(getErrorKey(error, t));
      void getLogger().then((logger) =>
        logger.error('Update datasource failed', { error }),
      );
      setIsConnecting(false);
    },
  );

  const deleteDatasourceMutation = useDeleteDatasource(
    datasourceRepository,
    () => {
      toast.success(<Trans i18nKey="datasources:deleteSuccess" />);
      setIsDeleteDialogOpen(false);
      onSuccess();
    },
    (error) => {
      toast.error(getErrorKey(error, t));
      void getLogger().then((logger) =>
        logger.error('Delete datasource failed', { error }),
      );
    },
  );

  const handleTestConnection = useCallback(async () => {
    if (!extension?.data) return;
    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }

    const result = await validateDatasourceConfigPipeline({
      values: formValues,
      extensionId,
      schema: effectiveSchema,
      extensionMeta: extension.data,
    });
    if (!result.success) {
      setValidationError(result.zodError ?? null);
      toast.error(result.error);
      return;
    }
    setValidationError(null);
    const validData = result.config;

    const dsMeta = extension.data as DatasourceExtension | undefined;
    if (!dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }

    let driver;
    try {
      driver = resolveDriverOrThrow(dsMeta, { config: validData });
    } catch (err) {
      toast.error(
        err instanceof Error ? (
          err.message
        ) : (
          <Trans i18nKey="datasources:notFoundError" />
        ),
      );
      return;
    }

    const datasourceKind =
      (driver.runtime ?? 'browser') === 'browser'
        ? DatasourceKind.EMBEDDED
        : DatasourceKind.REMOTE;

    const testDatasource: Partial<Datasource> = {
      datasource_provider: extension.data.id,
      datasource_driver: driver.id,
      datasource_kind: datasourceKind,
      name: datasourceName || 'Test Connection',
      config: validData,
    };
    onTestConnectionLoadingChange?.(true);
    testConnectionMutation.mutate(testDatasource as Datasource);
  }, [
    extension.data,
    effectiveSchema,
    formValues,
    datasourceName,
    testConnectionMutation,
    onTestConnectionLoadingChange,
    extensionId,
  ]);

  const handleConnect = useCallback(async () => {
    if (!extension?.data) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }
    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }

    setIsConnecting(true);

    let projectId = workspace.projectId;
    if (!projectId) {
      const getProjectBySlugService = new GetProjectBySlugService(
        projectRepository,
      );
      try {
        const project = await getProjectBySlugService.execute(projectSlug);
        projectId = project.id;
      } catch (error) {
        toast.error(getErrorKey(error, t));
        setIsConnecting(false);
        return;
      }
    }

    if (!projectId) {
      toast.error(t(ERROR_KEYS.generic));
      setIsConnecting(false);
      return;
    }

    const result = await validateDatasourceConfigPipeline({
      values: formValues,
      extensionId,
      schema: effectiveSchema,
      extensionMeta: extension.data,
    });
    if (!result.success) {
      setValidationError(result.zodError ?? null);
      toast.error(result.error);
      setIsConnecting(false);
      return;
    }
    setValidationError(null);
    const validData = result.config;

    const dsMeta = extension.data as DatasourceExtension | undefined;
    if (!dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      setIsConnecting(false);
      return;
    }

    let driver;
    try {
      driver = resolveDriverOrThrow(dsMeta, { config: validData });
    } catch (err) {
      toast.error(
        err instanceof Error ? (
          err.message
        ) : (
          <Trans i18nKey="datasources:notFoundError" />
        ),
      );
      setIsConnecting(false);
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
      config: validData,
      createdBy: workspace.userId,
    });
  }, [
    t,
    extension.data,
    effectiveSchema,
    formValues,
    datasourceName,
    projectSlug,
    workspace.projectId,
    workspace.userId,
    projectRepository,
    createDatasourceMutation,
    extensionId,
  ]);

  const handleUpdate = useCallback(async () => {
    const dsMeta = extension?.data as DatasourceExtension | undefined;
    if (!existingDatasource || !dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }
    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }
    setIsConnecting(true);

    const result = await validateDatasourceConfigPipeline({
      values: formValues,
      extensionId,
      schema: effectiveSchema,
      extensionMeta: extension.data,
    });
    if (!result.success) {
      setValidationError(result.zodError ?? null);
      toast.error(result.error);
      setIsConnecting(false);
      return;
    }
    setValidationError(null);
    const validData = result.config;

    let driver;
    try {
      driver = resolveDriverOrThrow(dsMeta, { config: validData });
    } catch (err) {
      toast.error(
        err instanceof Error ? (
          err.message
        ) : (
          <Trans i18nKey="datasources:notFoundError" />
        ),
      );
      setIsConnecting(false);
      return;
    }

    const datasourceKind =
      driver.runtime === 'browser'
        ? DatasourceKind.EMBEDDED
        : DatasourceKind.REMOTE;

    updateDatasourceMutation.mutate({
      id: existingDatasource.id,
      name: datasourceName.trim() || existingDatasource.name,
      datasource_driver: driver.id,
      datasource_kind: datasourceKind,
      config: validData,
      updatedBy: workspace.userId ?? 'system',
    });
  }, [
    existingDatasource,
    extension.data,
    effectiveSchema,
    formValues,
    datasourceName,
    workspace.userId,
    updateDatasourceMutation,
    extensionId,
  ]);

  const handleConfirmDelete = useCallback(() => {
    if (!existingDatasource?.id) {
      toast.error(<Trans i18nKey="datasources:deleteMissingId" />);
      return;
    }
    deleteDatasourceMutation.mutate({
      id: existingDatasource.id,
      projectId: existingDatasource.projectId,
    });
  }, [existingDatasource, deleteDatasourceMutation]);

  const isTestConnectionLoading = testConnectionMutation.isPending;
  const isPending =
    isTestConnectionLoading ||
    createDatasourceMutation.isPending ||
    updateDatasourceMutation.isPending ||
    deleteDatasourceMutation.isPending;
  const isActionDisabled = isConnecting || isPending;
  const isTestConnectionDisabled = isActionDisabled;
  // Edit flow: allow save while a test is in flight (user may skip re-test after edits).
  const isSubmitDisabled =
    isActionDisabled || (existingDatasource ? false : isTestConnectionLoading);

  const handleDeleteClick = useCallback(() => setIsDeleteDialogOpen(true), []);

  const actionsEl = (
    <DatasourceFormActions
      onCancel={onCancel}
      onTestConnection={handleTestConnection}
      onSubmit={existingDatasource ? handleUpdate : handleConnect}
      isActionDisabled={isActionDisabled}
      isTestConnectionDisabled={isTestConnectionDisabled}
      isSubmitDisabled={isSubmitDisabled}
      isPending={isPending}
      isConnecting={isConnecting}
      existingDatasource={existingDatasource}
      onDeleteClick={handleDeleteClick}
    />
  );

  return (
    <div
      className={cn(
        variant === 'sheet' ? 'w-full' : 'mx-auto max-w-3xl',
        'space-y-8',
        className,
      )}
    >
      {showHeader && (
        <header className="space-y-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="bg-muted/30 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
              {extensionMeta.icon && (
                <img
                  src={extensionMeta.icon}
                  alt={extensionMeta.name}
                  className={cn(
                    'h-9 w-9 object-contain',
                    shouldInvertDatasourceIcon(extensionId) && 'dark:invert',
                  )}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-2xl font-semibold tracking-tight">
                Connect to {extensionMeta.name}
              </span>
              <DatasourceDocsLink docsUrl={docsUrl} />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Name:
            </span>
            {!isNameControlled ? (
              isEditingName ? (
                <>
                  <Input
                    ref={titleInputRef}
                    autoFocus
                    value={datasourceName}
                    onChange={(e) => setDatasourceName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    maxLength={DATASOURCE_INPUT_MAX_LENGTH.name}
                    autoComplete="off"
                    className="bg-muted/40 focus-visible:ring-ring h-8 min-w-[120px] flex-1 rounded-md border-0 px-2 text-base font-medium shadow-none focus-visible:ring-2"
                    placeholder="Name..."
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={handleNameSave}
                    aria-label="Save name"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setDatasourceName(generateRandomName())}
                    title="Randomize name"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      setDatasourceName(nameSnapshotRef.current);
                      setIsEditingName(false);
                    }}
                    aria-label="Discard name changes"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-foreground min-w-0 truncate text-base font-medium">
                    {datasourceName || 'Untitled datasource'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                    onClick={() => setDatasourceName(generateRandomName())}
                    title="Randomize name"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                    onClick={() => {
                      nameSnapshotRef.current = datasourceName;
                      setIsEditingName(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )
            ) : (
              <span className="text-foreground min-w-0 truncate text-base font-medium">
                {datasourceName || 'Untitled datasource'}
              </span>
            )}
          </div>
        </header>
      )}

      <div className="grid gap-6">
        <section className={cn('py-4', variant === 'sheet' ? 'px-0' : 'px-4')}>
          {extension.isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <Loader2 className="text-primary/30 h-10 w-10 animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">
                Configuring extension interface...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {extensionId === 's3' ? (
                <DatasourceS3Fields
                  key={existingDatasource?.id ?? 'new'}
                  formId={formId ?? 'datasource-form'}
                  onFormReady={handleFormReady}
                  onValidityChange={setSchemaValid}
                  defaultValues={editFormDefaults}
                />
              ) : usePresetForm ? (
                <DatasourceConnectionFields
                  key={existingDatasource?.id ?? `new-${extensionId}`}
                  extensionId={extensionId}
                  formConfig={undefined}
                  onFormReady={handleFormReady}
                  onValidityChange={setSchemaValid}
                  _formId={formId ?? 'datasource-form'}
                  defaultValues={editFormDefaults}
                />
              ) : (
                <FormRenderer
                  schema={effectiveSchema}
                  onSubmit={() => {}}
                  formId={formId ?? 'datasource-form'}
                  locale={i18n.resolvedLanguage}
                  onFormReady={(values) =>
                    handleFormReady(values as Record<string, unknown>)
                  }
                  onValidityChange={setSchemaValid}
                  defaultValues={editFormDefaults}
                />
              )}
              {urlValidation.gsheetHintUrl && extensionId === 'csv-online' ? (
                <div className="border-border/40 bg-muted/20 text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                  <span className="max-w-xs">
                    This looks like a Google Sheets link. For the best
                    experience, use the Google Sheets datasource instead.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => {
                      onSwitchToGsheet?.(String(urlValidation.gsheetHintUrl));
                    }}
                  >
                    Switch to Google Sheets
                  </Button>
                </div>
              ) : urlValidation.error ? (
                <p
                  className="border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/40 dark:bg-destructive/10 mt-1 flex gap-2 rounded-md border px-3 py-1.5 text-xs leading-snug font-medium dark:text-red-300"
                  role="alert"
                  data-test="datasource-url-validation-error"
                >
                  {urlValidation.error}
                </p>
              ) : null}
              {validationError && (
                <ZodErrorVisualizer
                  error={validationError}
                  className="mt-4"
                  title="Check the following fields"
                />
              )}
            </div>
          )}
        </section>

        {!variant.includes('sheet') && actionsEl}
      </div>

      {portalTarget ? createPortal(actionsEl, portalTarget) : null}

      {existingDatasource && (
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!deleteDatasourceMutation.isPending)
              setIsDeleteDialogOpen(open);
          }}
        >
          <AlertDialogContent className="z-200" overlayClassName="z-200">
            <AlertDialogHeader>
              <AlertDialogTitle>
                <Trans i18nKey="datasources:deleteConfirmTitle" />
              </AlertDialogTitle>
              <AlertDialogDescription>
                <Trans
                  i18nKey="datasources:deleteConfirmDescription"
                  values={{ name: datasourceName }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteDatasourceMutation.isPending}>
                <Trans i18nKey="datasources:cancel" />
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmDelete}
                disabled={deleteDatasourceMutation.isPending}
              >
                {deleteDatasourceMutation.isPending ? (
                  <Trans i18nKey="datasources:deleting" />
                ) : (
                  <Trans i18nKey="datasources:deleteButton" />
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
