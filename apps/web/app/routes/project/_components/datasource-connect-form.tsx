'use client';

import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';
import { z as zLib } from 'zod';
import { Loader2, Pencil, Shuffle, Check } from 'lucide-react';
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
} from '~/lib/utils/datasource-utils';
import { DatasourceDocsLink } from './datasource-docs-link';
import {
  ERROR_KEYS,
  getErrorKey,
  getFirstZodValidationMessage,
} from '~/lib/utils/error-key';

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
}: DatasourceConnectFormProps) {
  const [internalName, setInternalName] = useState(
    () => existingDatasource?.name ?? generateRandomName(),
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [schemaValid, setSchemaValid] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);

  const urlValidation = useMemo(() => {
    if (
      !extensionMeta?.supportsPreview ||
      (extensionMeta?.previewUrlKind !== 'embeddable' &&
        extensionMeta?.previewUrlKind !== 'data-file')
    ) {
      return { valid: true, error: null as string | null };
    }
    const url = getUrlForValidation(formValues, extensionMeta);
    const result = validateDatasourceUrl(extensionMeta, url);
    return { valid: result.isValid, error: result.error };
  }, [formValues, extensionMeta]);

  const isFormValid = schemaValid && urlValidation.valid;

  useEffect(() => {
    onFormValidityChange?.(isFormValid);
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

  /** Fallback when extension has no schema (e.g. 404 on schema.js). FormRenderer always used. */
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
        setIsEditingName(false);
      }
    },
    [handleNameSave],
  );

  const handleFormReady = useCallback(
    (values: Record<string, unknown>) => {
      setFormValues(values);
      onFormValuesChange?.(values);
    },
    [onFormValuesChange],
  );

  const createDatasourceMutation = useCreateDatasource(
    datasourceRepository,
    (_datasource) => {
      toast.success(<Trans i18nKey="datasources:saveSuccess" />);
      setIsConnecting(false);
      onSuccess();
    },
    (error) => {
      toast.error(getErrorKey(error, t));
      console.error(error);
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
      const errorMessage =
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:updateFailed" />
        );
      toast.error(errorMessage);
      console.error(error);
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
      const errorMessage =
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:deleteFailed" />
        );
      toast.error(errorMessage);
      console.error(error);
    },
  );

  const handleTestConnection = useCallback(() => {
    if (!extension?.data) return;
    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }
    const parsed = (effectiveSchema as z.ZodTypeAny).safeParse(formValues);
    if (!parsed.success) {
      const msg =
        getFirstZodValidationMessage(parsed.error) || 'Invalid configuration';
      toast.error(msg);
      return;
    }
    const validData = parsed.data as Record<string, unknown>;
    const testDatasource: Partial<Datasource> = {
      datasource_provider: extension.data.id,
      datasource_driver: extension.data.id,
      datasource_kind: DatasourceKind.EMBEDDED,
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

    const parsed = (effectiveSchema as z.ZodTypeAny).safeParse(formValues);
    if (!parsed.success) {
      const msg =
        getFirstZodValidationMessage(parsed.error) || 'Invalid configuration';
      toast.error(msg);
      setIsConnecting(false);
      return;
    }
    const validData = parsed.data as Record<string, unknown>;

    const dsMeta = extension.data as DatasourceExtension | undefined;
    if (!dsMeta) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }
    const driver =
      dsMeta.drivers.find(
        (d: { id: string }) =>
          d.id === (validData as { driverId?: string })?.driverId,
      ) ?? dsMeta.drivers[0];
    const runtime = driver?.runtime ?? 'browser';
    const datasourceKind =
      runtime === 'browser' ? DatasourceKind.EMBEDDED : DatasourceKind.REMOTE;

    const userId = workspace.userId;

    createDatasourceMutation.mutate({
      projectId,
      name: datasourceName.trim() || generateRandomName(),
      description: extension.data.description || '',
      datasource_provider: extension.data.id || '',
      datasource_driver: extension.data.id || '',
      datasource_kind: datasourceKind as string,
      config: validData,
      createdBy: userId,
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
  ]);

  const handleUpdate = useCallback(async () => {
    const ext = extension?.data;
    if (!existingDatasource || !ext) {
      toast.error(<Trans i18nKey="datasources:notFoundError" />);
      return;
    }
    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }
    setIsConnecting(true);
    const parsed = (effectiveSchema as z.ZodTypeAny).safeParse(formValues);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid configuration';
      toast.error(msg);
      setIsConnecting(false);
      return;
    }
    const validData = parsed.data as Record<string, unknown>;
    updateDatasourceMutation.mutate({
      id: existingDatasource.id,
      name: datasourceName.trim() || existingDatasource.name,
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
  const isTestConnectionDisabled = isActionDisabled || !isFormValid;
  const isSubmitDisabled =
    isActionDisabled ||
    !isFormValid ||
    (existingDatasource ? false : isTestConnectionLoading);
  const actionsEl = (
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
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isActionDisabled}
            data-test="datasource-delete-button"
          >
            <Trans i18nKey="datasources:deleteButton" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTestConnectionDisabled}
          className="border-border border bg-white font-semibold text-black shadow-sm transition-all hover:bg-gray-50 hover:text-black"
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          <Trans i18nKey="datasources:testConnection" />
        </Button>
        <Button
          onClick={existingDatasource ? handleUpdate : handleConnect}
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
                    extensionId === 'json-online' && 'dark:invert',
                  )}
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-2xl font-semibold tracking-tight">
                Connect to {extensionMeta.name}
              </span>
              <DatasourceDocsLink docsUrl={extension.data?.docsUrl} />
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
                    onBlur={handleNameSave}
                    onKeyDown={handleNameKeyDown}
                    autoComplete="off"
                    className="bg-muted/40 focus-visible:ring-ring h-8 min-w-[120px] flex-1 rounded-md border-0 px-2 text-base font-medium shadow-none focus-visible:ring-2"
                    placeholder="Name..."
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={handleNameSave}
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
                    onClick={() => setIsEditingName(true)}
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
              <FormRenderer
                schema={effectiveSchema}
                onSubmit={() => {}}
                formId={formId ?? 'datasource-form'}
                locale={i18n.resolvedLanguage}
                onFormReady={(values) =>
                  handleFormReady(values as Record<string, unknown>)
                }
                onValidityChange={setSchemaValid}
                defaultValues={
                  existingDatasource?.config as
                    | Record<string, unknown>
                    | undefined
                }
              />
              {urlValidation.error ? (
                <p
                  className="text-destructive text-sm"
                  role="alert"
                  data-test="datasource-url-validation-error"
                >
                  {urlValidation.error}
                </p>
              ) : null}
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
          <AlertDialogContent className="z-[200]" overlayClassName="z-[200]">
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
