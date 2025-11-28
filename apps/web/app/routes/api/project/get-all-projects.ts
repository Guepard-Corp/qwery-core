import type { ActionFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import {
  CreateProjectService,
  GetProjectsService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';

function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
}

export async function loader() {
  const repositories = await createRepositories();
  const repository = repositories.project;

  try {
    const useCase = new GetProjectsService(repository);
    const projects = await useCase.execute();
    return Response.json(projects);
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
