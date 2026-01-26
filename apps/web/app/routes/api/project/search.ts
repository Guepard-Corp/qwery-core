import type { LoaderFunctionArgs } from 'react-router';

import { GetProjectsByOrganizationIdService } from '@qwery/domain/services';
import { ProjectOutput } from '@qwery/domain/usecases';

import { createRepositories } from '~/lib/repositories/repositories-factory';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
} from '../_utils/http';

export async function loader({ request }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.project;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const orgId = (url.searchParams.get('orgId') ?? '').trim();
  const limit = parseLimit(url.searchParams.get('limit'), 10, 50);
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0) ?? 0;

  try {
    const projects = orgId
      ? await new GetProjectsByOrganizationIdService(repository).execute(orgId)
      : (await repository.findAll()).map((p) => ProjectOutput.new(p));

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

    return Response.json({
      results: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error in projects search loader:', error);
    return handleDomainException(error);
  }
}
