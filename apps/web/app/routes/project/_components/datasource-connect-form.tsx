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
import { DatasourceExtension } from '@qwery/extensions-sdk';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateDatasource } from '~/lib/mutations/use-create-datasource';
import { generateRandomName } from '~/lib/names';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { useExtensionSchema } from '~/lib/queries/use-extension-schema';
import { FormRenderer } from '@qwery/ui/form-renderer';
import { DatasourceDocsLink } from './datasource-docs-link';

export interface DatasourceConnectFormProps {
  extensionId: string;
  projectSlug: string;
  extensionMeta: DatasourceExtension;
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
  onTestConnectionLoadingChange?: (isLoading: boolean) => void;
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
  onTestConnectionLoadingChange,
}: DatasourceConnectFormProps) {
  const [internalName, setInternalName] = useState(() => generateRandomName());
  const [isEditingName, setIsEditingName] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isFormValid, setIsFormValid] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLDivElement | null>(null);

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

  const { i18n } = useTranslation();
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

  const formatTestConnectionError = (error: unknown) => {
    if (error instanceof Error) {
      const raw = error.message ?? '';
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] as {
            message?: string;
            path?: (string | number)[];
          };
          if (first && typeof first.message === 'string') {
            if (Array.isArray(first.path) && first.path.length > 0) {
              return `${first.path.join('.')}: ${first.message}`;
            }
            return first.message;
          }
        }
      } catch {
        // fall through to raw message
      }
      return raw || <Trans i18nKey="datasources:connectionTestError" />;
    }
    return <Trans i18nKey="datasources:connectionTestError" />;
  };

  const testConnectionMutation = useTestConnection(
    (result) => {
      onTestConnectionLoadingChange?.(false);
      if (result.success && result.data?.connected) {
        toast.success(<Trans i18nKey="datasources:connectionTestSuccess" />);
      } else {
        toast.error(
          result.error || <Trans i18nKey="datasources:connectionTestFailed" />,
        );
      }
    },
    (error) => {
      onTestConnectionLoadingChange?.(false);
      toast.error(formatTestConnectionError(error));
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
      const errorMessage =
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:saveFailed" />
        );
      toast.error(errorMessage);
      console.error(error);
      setIsConnecting(false);
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
      const msg = parsed.error.issues[0]?.message ?? 'Invalid configuration';
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
    extensionId,
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
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to resolve project context for datasource',
        );
        setIsConnecting(false);
        return;
      }
    }

    if (!projectId) {
      toast.error('Unable to resolve project context for datasource');
      setIsConnecting(false);
      return;
    }

    const parsed = (effectiveSchema as z.ZodTypeAny).safeParse(formValues);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid configuration';
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
        (d) => d.id === (validData as { driverId?: string })?.driverId,
      ) ?? dsMeta.drivers[0];
    const runtime = driver?.runtime ?? 'browser';
    const datasourceKind =
      runtime === 'browser' ? DatasourceKind.EMBEDDED : DatasourceKind.REMOTE;

    const userId = 'system';

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
    extension.data,
    extensionId,
    effectiveSchema,
    formValues,
    datasourceName,
    projectSlug,
    workspace.projectId,
    projectRepository,
    createDatasourceMutation,
  ]);

  const isTestConnectionLoading = testConnectionMutation.isPending;
  const isPending =
    isTestConnectionLoading || createDatasourceMutation.isPending;
  const actionsEl = (
    <div className="flex flex-col-reverse gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={isConnecting || isPending}
        className="text-muted-foreground hover:text-foreground hover:bg-transparent"
      >
        Cancel
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isPending || !isFormValid || isConnecting}
          className="border-border border bg-white font-semibold text-black shadow-sm transition-all hover:bg-gray-50 hover:text-black"
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Test Connection
        </Button>
        <Button
          onClick={handleConnect}
          disabled={
            isConnecting || isPending || !isFormValid || isTestConnectionLoading
          }
          className="border-0 bg-yellow-400 font-bold text-black shadow-lg transition-all hover:bg-yellow-500"
        >
          {isConnecting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Check className="mr-2 size-4" />
          )}
          Connect
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
                onValidityChange={setIsFormValid}
              />
            </div>
          )}
        </section>

        {!variant.includes('sheet') && actionsEl}
      </div>

      {portalTarget ? createPortal(actionsEl, portalTarget) : null}
    </div>
  );
}
