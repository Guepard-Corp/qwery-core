import type { LoaderFunctionArgs } from 'react-router';

import { GetOrganizationsService } from '@qwery/domain/services';

import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException, parseLimit, parsePositiveInt } from '../_utils/http';

export async function loader({ request }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.organization;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = parseLimit(url.searchParams.get('limit'), 10, 50);
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0) ?? 0;

  try {
    const useCase = new GetOrganizationsService(repository);
    const organizations = await useCase.execute();

    const filtered = q
      ? organizations.filter((org) => {
          const name = org.name?.toLowerCase() ?? '';
          const slug = org.slug?.toLowerCase() ?? '';
          return name.includes(q) || slug.includes(q);
        })
      : organizations;

    return Response.json({
      results: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error in organizations search loader:', error);
    return handleDomainException(error);
  }
}


