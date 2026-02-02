import { useState } from 'react';
import * as React from 'react';

import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { type Datasource } from '@qwery/domain/entities';
import { FormRenderer } from '@qwery/ui/form-renderer';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@qwery/ui/card';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
  useGetDatasourceBySlug,
} from '~/lib/queries/use-get-datasources';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

export async function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const slug = params.slug as string;
  if (!slug) return { datasource: null };

  const repositories = await getRepositoriesForLoader();
  const getDatasourceService = new GetDatasourceBySlugService(
    repositories.datasource,
  );

  try {
    const datasource = await getDatasourceService.execute(slug);
    return { datasource };
  } catch (error) {
    if (error instanceof DomainException) return { datasource: null };
    throw error;
  }
}

export default function ProjectDatasourceViewPage(props?: {
  loaderData?: { datasource: Awaited<ReturnType<typeof loader>>['datasource'] };
}) {
  const navigate = useNavigate();
  const params = useParams();
  const slug = params.slug as string;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [datasourceName, setDatasourceName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const { repositories } = useWorkspace();
  const datasourceRepository = repositories.datasource;
  const datasourceFromQuery = useGetDatasourceBySlug(
    datasourceRepository,
    slug,
  );
  const datasourceFromLoader = props?.loaderData?.datasource;
  const datasource = datasourceFromLoader
    ? { data: datasourceFromLoader, isLoading: false }
    : datasourceFromQuery;

  // Load extension once datasource is loaded
  const extension = useGetExtension(
    datasource?.data?.datasource_provider || '',
  );

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  React.useEffect(() => {
    if (datasource.data?.name) {
      setDatasourceName(datasource.data.name);
    }
  }, [datasource.data]);

  const handleNameSave = () => {
    if (datasourceName.trim()) {
      setIsEditingName(false);
    } else if (datasource.data?.name) {
      setDatasourceName(datasource.data.name);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape' && datasource.data?.name) {
      setDatasourceName(datasource.data.name);
      setIsEditingName(false);
    }
  };

  const testConnectionMutation = useTestConnection(
    (result) => {
      if (result.success && result.data?.connected) {
        toast.success('Connection test successful');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to test connection',
      );
    },
  );

  if (datasource.isLoading || extension.isLoading) {
    return <div>Loading...</div>;
  }

  if (!datasource.data) {
    return <div>Datasource not found</div>;
  }

  if (!extension.data) {
    return <div>Extension not found</div>;
  }

  const provider = extension.data.id;

  // Helper: Validate provider config
  const validateProviderConfig = (
    config: Record<string, unknown>,
  ): string | null => {
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
    if (provider === 'gsheet-csv') {
      return { sharedLink: config.sharedLink || config.url };
    }
    if (provider === 'json-online') {
      return { jsonUrl: config.jsonUrl || config.url || config.connectionUrl };
    }
    if (provider === 'parquet-online') {
      return { url: config.url || config.connectionUrl };
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
  const isFormValid = (values: Record<string, unknown>): boolean => {
    if (provider === 'gsheet-csv') {
      return !!(values.sharedLink || values.url);
    }
    if (provider === 'json-online') {
      return !!(values.jsonUrl || values.url || values.connectionUrl);
    }
    if (provider === 'parquet-online') {
      return !!(values.url || values.connectionUrl);
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
    setIsSubmitting(true);
    try {
      if (!extension || !datasource) {
        toast.error('Extension or datasource not found');
        return;
      }

      let config = values as Record<string, unknown>;
      const userId = 'system'; // Default user - replace with actual user context

      if (!datasource.data) {
        toast.error('Datasource not found');
        return;
      }

      if (!provider) {
        toast.error('Extension provider not found');
        setIsSubmitting(false);
        return;
      }

      const validationError = validateProviderConfig(config);
      if (validationError) {
        toast.error(validationError);
        setIsSubmitting(false);
        return;
      }

      config = normalizeProviderConfig(config);

      // Update datasource object
      const updatedDatasource: Datasource = {
        ...datasource.data,
        name: datasourceName.trim() || datasource.data.name,
        config,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Update in IndexedDB using repository
      await datasourceRepository.update(updatedDatasource);

      toast.success('Datasource updated successfully');

      // Navigate back to datasources list
      if (datasource.data.projectId) {
        // Try to find project slug from context or navigate to a generic path
        navigate(
          createPath(
            pathsConfig.app.projectDatasources,
            datasource.data.projectId,
          ),
        );
      } else {
        navigate(-1);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update datasource';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = () => {
    if (!extension?.data || !datasource.data) return;

    if (!formValues) {
      toast.error('Form not ready yet');
      return;
    }

    const validationError = validateProviderConfig(formValues);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedConfig = normalizeProviderConfig(formValues);

    testConnectionMutation.mutate({
      ...datasource.data,
      config: normalizedConfig,
    });
  };

  const invalidateDatasourceQueries = async (projectId?: string | null) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: getDatasourcesKey() }),
    ];
    if (projectId) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: getDatasourcesByProjectIdKey(projectId),
        }),
      );
    }
    await Promise.all(invalidations);
  };

  const handleConfirmDelete = async () => {
    if (!datasource.data?.id) {
      toast.error('Missing datasource identifier');
      return;
    }
    setIsDeleting(true);
    try {
      await datasourceRepository.delete(datasource.data.id);
      await invalidateDatasourceQueries(datasource.data.projectId);
      toast.success('Datasource deleted successfully');

      if (datasource.data.projectId) {
        navigate(
          createPath(
            pathsConfig.app.projectDatasources,
            datasource.data.projectId,
          ),
          { replace: true },
        );
      } else {
        navigate(-1);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete datasource',
      );
      console.error(error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="p-2 lg:p-4">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            {extension.data?.logo && (
              <img
                src={extension.data?.logo}
                alt={extension.data?.name}
                className={cn(
                  'h-12 w-12 rounded object-contain',
                  datasource?.data?.datasource_provider === 'json-online' &&
                    'dark:invert',
                )}
              />
            )}
            <div>
              <CardTitle>
                <Trans
                  i18nKey="datasources:view_pageTitle"
                  defaults={`Edit ${extension.data?.name} Connection`}
                />
              </CardTitle>
              {extension.data?.description && (
                <CardDescription>{extension.data?.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Editable Datasource Name */}
          <div className="border-border mb-6 border-b pb-6">
            <label className="text-muted-foreground mb-2 block text-sm font-medium">
              Datasource Name
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
                    aria-label="Edit name"
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
              defaultValues={datasource.data?.config as Record<string, unknown>}
              onFormReady={setFormValues}
            />
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={
                  testConnectionMutation.isPending ||
                  isSubmitting ||
                  !formValues ||
                  !isFormValid(formValues)
                }
              >
                {testConnectionMutation.isPending
                  ? 'Testing...'
                  : 'Test Connection'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isSubmitting || isDeleting}
                data-test="datasource-delete-button"
              >
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={
                  isSubmitting || testConnectionMutation.isPending || isDeleting
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="datasource-form"
                disabled={
                  isSubmitting ||
                  testConnectionMutation.isPending ||
                  isDeleting ||
                  !formValues ||
                  !isFormValid(formValues)
                }
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete datasource?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove{' '}
              <span className="font-semibold">{datasourceName}</span> and any
              associated playground data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
