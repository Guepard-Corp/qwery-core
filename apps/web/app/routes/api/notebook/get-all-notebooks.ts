import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { DomainException } from '@qwery/domain/exceptions';
import {
  CreateNotebookService,
  GetNotebooksByProjectIdService,
} from '@qwery/domain/services';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { v4 as uuidv4 } from 'uuid';

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

export async function loader({ request }: LoaderFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.notebook;

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    // If projectId is provided, filter notebooks by project
    if (projectId) {
      const useCase = new GetNotebooksByProjectIdService(repository);
      const notebooks = await useCase.execute(projectId);
      return Response.json(notebooks || []);
    }

    // GET /api/notebooks - Get all notebooks (fallback for backward compatibility)
    // TODO: Create GetNotebooksService use case
    const notebooks = await repository.findAll();
    return Response.json(notebooks);
  } catch (error) {
    console.error('Error in get-all-notebooks loader:', error);
    return handleDomainException(error);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const repositories = await createRepositories();
  const repository = repositories.notebook;

  try {
    // POST /api/notebooks - Create notebook
    if (request.method === 'POST') {
      const body = await request.json();
      const useCase = new CreateNotebookService(repository);
      const notebook = await useCase.execute(body);

      // Initialize a conversation for this notebook
      // Each notebook gets its own conversation that all cells share
      try {
        const notebookTitle = `Notebook - ${notebook.id}`;

        // Check if conversation already exists (in case of race condition or retry)
        const existingConversations =
          await repositories.conversation.findByProjectId(notebook.projectId);
        const existingConversation = existingConversations.find(
          (conv) => conv.title === notebookTitle,
        );

        if (existingConversation) {
          // Conversation already exists, skip creation
          return Response.json(notebook, { status: 201 });
        }

        const conversationId = uuidv4();
        const now = new Date();

        // Get userId from notebook createdBy if available, otherwise use 'system'
        const notebookWithCreatedBy = notebook as {
          createdBy?: string;
        };
        const userId =
          notebookWithCreatedBy.createdBy ||
          body.createdBy ||
          body.userId ||
          'system';

        await repositories.conversation.create({
          id: conversationId,
          slug: '', // Repository will generate slug from ID
          title: notebookTitle,
          projectId: notebook.projectId,
          taskId: uuidv4(), // TODO: Create or get actual task
          datasources: [], // Start with empty datasources, will be added when cells use them
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
          isPublic: false,
          seedMessage: '',
        });
      } catch (convError) {
        // Log but don't fail notebook creation if conversation creation fails
        // The conversation will be created on first prompt if needed
        console.error('Failed to create conversation for notebook:', convError);
      }

      return Response.json(notebook, { status: 201 });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Error in get-all-notebooks action:', error);
    return handleDomainException(error);
  }
}
