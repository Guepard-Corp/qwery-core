import {
  GetConversationBySlugService,
  GetNotebookBySlugService,
  GetProjectBySlugService,
} from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

export async function loadProjectName(
  request: Request,
  slug: string | undefined,
): Promise<string> {
  if (!slug) throw new Response('Not Found', { status: 404 });
  const repositories = await getRepositoriesForLoader(request);
  const getProjectService = new GetProjectBySlugService(repositories.project);
  try {
    const project = await getProjectService.execute(slug);
    return project.name;
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}

export async function loadNotebookTitle(
  request: Request,
  slug: string | undefined,
): Promise<string> {
  if (!slug) throw new Response('Not Found', { status: 404 });
  const repositories = await getRepositoriesForLoader(request);
  const service = new GetNotebookBySlugService(repositories.notebook);
  try {
    const notebook = await service.execute(slug);
    return notebook.title?.trim() || 'Notebook';
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}

export async function loadConversationTitle(
  request: Request,
  slug: string | undefined,
): Promise<string> {
  if (!slug) throw new Response('Not Found', { status: 404 });
  const repositories = await getRepositoriesForLoader(request);
  const service = new GetConversationBySlugService(repositories.conversation);
  try {
    const conversation = await service.execute(slug);
    return conversation.title?.trim() || 'Chat';
  } catch (error) {
    if (error instanceof DomainException) {
      throw new Response('Not Found', { status: 404 });
    }
    throw error;
  }
}
