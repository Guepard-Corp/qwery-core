import { useParams } from 'react-router';

import { SchemaGraph } from '@qwery/ui/schema-graph';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from './+types/schema';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

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

export default function Schema(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const { datasource } = props.loaderData;

  const {
    data: metadata,
    isLoading: isLoadingMetadata,
    isError,
  } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  if (!slug) return null;

  if (isLoadingMetadata) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
      </div>
    );
  }

  if (!datasource) {
    throw new Response('Not Found', { status: 404 });
  }

  if (isError || !metadata) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Failed to load datasource metadata.
        </p>
      </div>
    );
  }

  const storageKey = `datasource-schema-positions:${datasource.id ?? slug}`;

  return (
    <div className="h-full w-full">
      <SchemaGraph metadata={metadata} storageKey={storageKey} />
    </div>
  );
}
