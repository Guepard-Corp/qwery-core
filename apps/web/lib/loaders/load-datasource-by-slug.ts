import { DomainException } from '@qwery/domain/exceptions';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import type { ClientLoaderFunctionArgs } from 'react-router';

import { getDatasourceKey } from '~/lib/queries/use-get-datasources';
import { getQueryClient } from '~/lib/query-client';
import { getRepositoriesForLoader } from './create-repositories';

export async function loadDatasourceBySlug(args: ClientLoaderFunctionArgs) {
  const slug = args.params.slug;
  if (!slug) throw new Response('Not Found', { status: 404 });

  const repositories = await getRepositoriesForLoader(args.request);
  const service = new GetDatasourceBySlugService(repositories.datasource);

  try {
    const datasource = await service.execute(slug);
    getQueryClient().setQueryData(getDatasourceKey(slug), datasource);
    return { datasource };
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}
