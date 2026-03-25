import { useNavigate, useParams } from 'react-router';

import { Database, Loader2 } from 'lucide-react';

import { Trans } from '@qwery/ui/trans';

import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';
import { pageTitle } from '~/lib/page-title';

import type { Route } from './+types/settings';
import { DatasourceConnectSheet } from '../project/_components/datasource-connect-sheet';

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const slug = args.params.slug;
  if (!slug) {
    throw new Response('Not Found', { status: 404 });
  }

  const repositories = await getRepositoriesForLoader(args.request);
  const getDatasourceService = new GetDatasourceBySlugService(
    repositories.datasource,
  );

  try {
    const datasource = await getDatasourceService.execute(slug);
    return { datasource };
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  {
    title: pageTitle(
      data?.datasource?.name?.trim()
        ? `Datasource settings · ${data.datasource.name}`
        : 'Datasource settings',
    ),
  },
];

export default function ProjectDatasourceViewPage(props: Route.ComponentProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { datasource } = props.loaderData;

  const extension = useGetExtension(datasource.datasource_provider ?? '');

  const handleSuccess = () => {
    navigate(createPath(pathsConfig.app.datasourceSchema, slug ?? ''), {
      replace: true,
    });
  };

  const handleCancel = () => {
    navigate(createPath(pathsConfig.app.datasourceSchema, slug ?? ''), {
      replace: true,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate(createPath(pathsConfig.app.datasourceSchema, slug ?? ''), {
        replace: true,
      });
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

  if (!extension.data) {
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

  return (
    <DatasourceConnectSheet
      open={true}
      onOpenChange={handleOpenChange}
      extensionId={datasource.datasource_provider}
      projectSlug={datasource.projectId ?? ''}
      extensionMeta={extension.data}
      existingDatasource={datasource}
      initialFormValues={
        datasource.config as Record<string, unknown> | undefined
      }
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
