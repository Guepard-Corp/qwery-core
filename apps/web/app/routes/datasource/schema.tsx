import { useParams } from 'react-router';

import { SchemaGraph } from '@qwery/ui/schema-graph';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import { DevProfiler } from '~/lib/perf/dev-profiler';

import type { Route } from './+types/schema';

export const clientLoader = loadDatasourceBySlug;

export default function Schema(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const { datasource } = props.loaderData;

  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    isError,
    isFetching,
  } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  if (!slug) return null;

  if (isLoadingMetadata || isFetching) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
      </div>
    );
  }

  if (!datasource) {
    throw new Response('Not Found', { status: 404 });
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Failed to load datasource metadata.
        </p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No schema data available for this datasource.
        </p>
      </div>
    );
  }

  const storageKey = `datasource-schema-positions:${datasource.id ?? slug}`;

  return (
    <div className="h-full w-full">
      <DevProfiler id="DatasourceSchema/SchemaGraph">
        <SchemaGraph metadata={metadata} storageKey={storageKey} />
      </DevProfiler>
    </div>
  );
}
