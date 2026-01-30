import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  CreateOrganizationService,
  GetOrganizationsService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
} from '../_utils/http';

export async function loader({ request }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.organization;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0) ?? 0;
  const limit = parseLimit(url.searchParams.get('limit'), 0, 200);

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

    const paginated =
      limit > 0
        ? filtered.slice(offset, offset + limit)
        : filtered.slice(offset);

    return Response.json(paginated);
  } catch (error) {
    console.error('Error in get-all-organizations loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.organization;

  try {
    // POST /api/organizations - Create organization
    if (request.method === 'POST') {
      const body = await request.json();
      const useCase = new CreateOrganizationService(repository);
      const organization = await useCase.execute(body);
      return Response.json(organization, { status: 201 });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in get-all-organizations action:', error);
    return handleDomainException(error);
  }
}
