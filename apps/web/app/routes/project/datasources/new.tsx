import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { type Datasource, DatasourceKind } from '@qwery/domain/entities';
import { FormRenderer, getExtension } from '@qwery/extensions-sdk';
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
import { useTestConnection } from '~/lib/mutations/use-test-connection';
import { generateRandomName } from '~/lib/names';
import { useGetExtension } from '~/lib/queries/use-get-extension';

import type { Route } from './+types/new';

export async function loader({ params }: Route.LoaderArgs) {
  const extension = await getExtension(params.id);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [datasourceName, setDatasourceName] = useState(() =>
    generateRandomName(),
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { repositories } = useWorkspace();
  const datasourceRepository = repositories.datasource;

  const extension = useGetExtension(extensionId);

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

  // Reset form values and generate new name when extension changes
  useEffect(() => {
    setFormValues(null);
    setDatasourceName(generateRandomName());
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

  const handleSubmit = async (values: unknown) => {
    setIsSubmitting(true);
    try {
      if (!extension) {
        toast.error(<Trans i18nKey="datasources:notFoundError" />);
        return;
      }

      const config = values as Record<string, unknown>;

      // Generate UUID for datasource ID
      const datasourceId = uuidv4();

      // For now, use a default projectId - in a real app this would come from context/storage
      const projectId = '550e8400-e29b-41d4-a716-446655440000'; // Default project ID
      const userId = 'system'; // Default user - replace with actual user context

      // Create datasource object
      const datasource: Datasource = {
        id: datasourceId,
        projectId,
        name: datasourceName.trim() || generateRandomName(),
        description: extension.data?.description || '',
        datasource_provider: extension.data?.id || '',
        datasource_driver: extension.data?.id || '',
        datasource_kind: DatasourceKind.EMBEDDED,
        slug: '',
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };

      // Save to IndexedDB using repository
      await datasourceRepository.create(datasource);

      toast.success(<Trans i18nKey="datasources:saveSuccess" />);

      // Navigate back to datasources list
      navigate(createPath(pathsConfig.app.projectNotebook, project_id));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="datasources:saveFailed" />
        );
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = () => {
    if (!extension?.data) return;

    if (!formValues) {
      toast.error(<Trans i18nKey="datasources:formNotReady" />);
      return;
    }

    const testDatasource: Partial<Datasource> = {
      datasource_provider: extension.data.id,
      datasource_driver: extension.data.id,
      datasource_kind: DatasourceKind.EMBEDDED,
      name: datasourceName || 'Test Connection',
      config: formValues,
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
            />
          )}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={
                testConnectionMutation.isPending || isSubmitting || !formValues
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
                disabled={isSubmitting || testConnectionMutation.isPending}
              >
                <Trans i18nKey="datasources:cancel" />
              </Button>
              <Button
                type="submit"
                form="datasource-form"
                disabled={isSubmitting || testConnectionMutation.isPending}
              >
                {isSubmitting ? (
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
