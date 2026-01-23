import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import {
  CreateProjectService,
  GetProjectsByOrganizationIdService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException, parseLimit, parsePositiveInt } from '../_utils/http';

export async function loader({
  request,
}: LoaderFunctionArgs<{ orgId: string }>) {
  const repositories = await createRepositories();
  const repository = repositories.project;

  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0) ?? 0;
  const limit = parseLimit(url.searchParams.get('limit'), 0, 200);

  if (!orgId) {
    return Response.json(
      { error: 'Organization ID is required' },
      { status: 400 },
    );
  }

  try {
    const useCase = new GetProjectsByOrganizationIdService(repository);
    const projects = await useCase.execute(orgId);

    const filtered = q
      ? projects.filter((project) => {
          const name = project.name?.toLowerCase() ?? '';
          const slug = project.slug?.toLowerCase() ?? '';
          const description = project.description?.toLowerCase() ?? '';
          return (
            name.includes(q) || slug.includes(q) || description.includes(q)
          );
        })
      : projects;

    const paginated =
      limit > 0 ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

    return Response.json(paginated);
  } catch (error) {
    console.error('Error in get-all-projects loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.project;

  try {
    // POST /api/projects - Create project
    if (request.method === 'POST') {
      const body = await request.json();
      const useCase = new CreateProjectService(repository);
      const project = await useCase.execute(body);
      return Response.json(project, { status: 201 });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in get-all-projects action:', error);
    return handleDomainException(error);
  }
}
