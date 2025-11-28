import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import {
  DeleteProjectService,
  GetProjectBySlugService,
  GetProjectService,
  UpdateProjectService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';

function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

export async function loader({ params }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.project;

  try {
    // GET /api/projects/:id - Get project by id or slug
    if (params.id) {
      const useCase = isUUID(params.id)
        ? new GetProjectService(repository)
        : new GetProjectBySlugService(repository);
      const project = await useCase.execute(params.id);
      return Response.json(project);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in project loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.project;

  try {
    // PUT /api/projects/:id - Update project
    if (request.method === 'PUT' && params.id) {
      const body = await request.json();
      const useCase = new UpdateProjectService(repository);
      const project = await useCase.execute({ ...body, id: params.id });
      return Response.json(project);
    }

    // DELETE /api/projects/:id - Delete project
    if (request.method === 'DELETE' && params.id) {
      const useCase = new DeleteProjectService(repository);
      await useCase.execute(params.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in project action:', error);
    return handleDomainException(error);
  }
}
