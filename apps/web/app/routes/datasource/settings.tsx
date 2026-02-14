import { useState } from 'react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
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
import { Input } from '@qwery/ui/input';
import { PageBody } from '@qwery/ui/page';
import { Trans } from '@qwery/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
} from '~/lib/queries/use-get-datasources';
import { useExtensionSchema } from '~/lib/queries/use-extension-schema';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from './+types/settings';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const slug = args.params.slug;
  if (!slug) return { datasource: null };

  const repositories = await getRepositoriesForLoader(args.request);
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

export default function ProjectDatasourceViewPage(props: Route.ComponentProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
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
  const { repositories, workspace } = useWorkspace();
  const datasourceRepository = repositories.datasource;
  const datasourceFromLoader = props.loaderData.datasource;
  const datasource = {
    data: datasourceFromLoader,
    isLoading: false,
  };

  const providerId = datasourceFromLoader?.datasource_provider ?? '';
  const extension = useGetExtension(providerId);
  const extensionSchema = useExtensionSchema(providerId);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  React.useEffect(() => {
    if (datasourceFromLoader?.name) {
      setDatasourceName(datasourceFromLoader.name);
    }
  }, [datasourceFromLoader]);

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

  if (extension.isLoading) {
    return <div>Loading...</div>;
  }

  if (!datasourceFromLoader) {
    return <div>Datasource not found</div>;
  }

  if (!extension.data) {
    return <div>Extension not found</div>;
  }

  const handleSubmit = async (values: unknown) => {
    setIsSubmitting(true);
    try {
      if (!extension || !datasource) {
        toast.error('Extension or datasource not found');
        return;
      }

      const config = values as Record<string, unknown>;
      const userId = workspace.userId;

      if (!datasource.data) {
        toast.error('Datasource not found');
        return;
      }

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

    testConnectionMutation.mutate({
      ...datasource.data,
      config: formValues,
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
    <>
      <PageBody className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <header className="flex items-center gap-4">
              {extension.data?.icon && (
                <img
                  src={extension.data?.icon}
                  alt={extension.data?.name}
                  className="h-12 w-12 rounded object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  <Trans
                    i18nKey="datasources:view_pageTitle"
                    values={{ name: extension.data?.name }}
                    defaults={`Edit ${extension.data?.name} Connection`}
                  />
                </h1>
                {extension.data?.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {extension.data?.description}
                  </p>
                )}
              </div>
            </header>

            {/* Editable Datasource Name */}
            <section className="border-border border-b pb-6">
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
            </section>

            {extensionSchema.data && (
              <FormRenderer
                schema={extensionSchema.data}
                onSubmit={handleSubmit}
                formId="datasource-form"
                locale={i18n.resolvedLanguage}
                defaultValues={
                  datasource.data?.config as Record<string, unknown>
                }
                onFormReady={(values) =>
                  setFormValues(values as Record<string, unknown> | null)
                }
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={
                    testConnectionMutation.isPending ||
                    isSubmitting ||
                    !formValues
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
                    isSubmitting ||
                    testConnectionMutation.isPending ||
                    isDeleting
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
                    isDeleting
                  }
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageBody>

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
    </>
  );
}
