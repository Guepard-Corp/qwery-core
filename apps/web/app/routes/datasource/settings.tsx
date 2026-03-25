import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Database, Loader2 } from 'lucide-react';

import { Trans } from '@qwery/ui/trans';

import pathsConfig, { createPath } from '~/config/paths.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetDatasourceBySlug } from '~/lib/queries/use-get-datasources';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import { useProject } from '~/lib/context/project-context';
import { DevProfiler } from '~/lib/perf/dev-profiler';

import { DatasourceConnectSheet } from '../project/_components/datasource-connect-sheet';

export default function ProjectDatasourceViewPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { repositories } = useWorkspace();
  const { projectSlug } = useProject();
  const datasourceRepository = repositories.datasource;

  const datasource = useGetDatasourceBySlug(datasourceRepository, slug ?? '');
  const extension = useGetExtension(
    datasource?.data?.datasource_provider ?? '',
  );

  const schemaPath = createPath(pathsConfig.app.datasourceSchema, slug ?? '');

  const closeToSchema = useCallback(() => {
    navigate(schemaPath, { replace: true });
  }, [navigate, schemaPath]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeToSchema();
    },
    [closeToSchema],
  );

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
    <DevProfiler id="DatasourceSettings/DatasourceConnectSheet">
      <DatasourceConnectSheet
        open={true}
        onOpenChange={handleOpenChange}
        extensionId={datasource.data.datasource_provider}
        projectSlug={projectSlug ?? ''}
        extensionMeta={extension.data}
        existingDatasource={datasource.data}
        initialFormValues={
          datasource.data.config as Record<string, unknown> | undefined
        }
        onSuccess={closeToSchema}
        onCancel={closeToSchema}
      />
    </DevProfiler>
  );
}
