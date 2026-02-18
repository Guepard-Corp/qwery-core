import { useNavigate, useParams } from 'react-router';

import { Database, Loader2 } from 'lucide-react';

import { Trans } from '@qwery/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetExtension } from '~/lib/queries/use-get-extension';

import { DatasourceConnectSheet } from '../project/_components/datasource-connect-sheet';

export default function ProjectDatasourceViewPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { repositories } = useWorkspace();
  const datasourceRepository = repositories.datasource;

  const datasource = useGetDatasourceBySlug(datasourceRepository, slug ?? '');
  const extension = useGetExtension(
    datasource?.data?.datasource_provider ?? '',
  );

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

  if (datasource.isLoading || extension.isLoading) {
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

  if (!datasource.data) {
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
      extensionId={datasource.data.datasource_provider}
      projectSlug={datasource.data.projectId ?? ''}
      extensionMeta={extension.data}
      existingDatasource={datasource.data}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
