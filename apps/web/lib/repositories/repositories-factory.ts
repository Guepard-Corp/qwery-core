import type { Repositories } from '@qwery/domain/repositories';
import type {
  IUserRepository,
  ITodoRepository,
} from '@qwery/domain/repositories';

const IS_SERVER = typeof process !== 'undefined' && process.env !== undefined;

const DATABASE_PROVIDER = (import.meta.env?.VITE_DATABASE_PROVIDER ||
  'indexed-db') as 'indexed-db' | 'sqlite';

function createUnsupportedUserRepository(): IUserRepository {
  const unsupported = (): never => {
    throw new Error('Unsupported');
  };
  return {
    findAll: unsupported,
    findById: unsupported,
    findBySlug: unsupported,
    create: unsupported,
    update: unsupported,
    delete: unsupported,
    shortenId: (id: string) => id,
  };
}

function createUnsupportedTodoRepository(): ITodoRepository {
  const unsupported = (): never => {
    throw new Error('Unsupported');
  };
  return {
    findByConversationId: unsupported,
    upsertByConversationId: unsupported,
  };
}

export async function createRepositories(): Promise<Repositories> {
  // Node (SSR/loaders): use API repositories that call apps/server; no direct file/SQLite access
  if (IS_SERVER) {
    const {
      ConversationRepository,
      DatasourceRepository,
      NotebookRepository,
      OrganizationRepository,
      ProjectRepository,
      MessageRepository,
      UsageRepository,
    } = await import('./index');

    return {
      user: createUnsupportedUserRepository(),
      organization: new OrganizationRepository(),
      project: new ProjectRepository(),
      datasource: new DatasourceRepository(),
      notebook: new NotebookRepository(),
      conversation: new ConversationRepository(),
      message: new MessageRepository(),
      usage: new UsageRepository(),
      todo: createUnsupportedTodoRepository(),
    };
  }

  // Browser (or Node without server URL): use IndexedDB or API repositories
  if (DATABASE_PROVIDER === 'sqlite') {
    // When using SQLite, use API repositories that call the backend API
    // (which uses SQLite repositories on the server)
    const [
      {
        UserRepository: IndexedDBUserRepository,
        TodoRepository: IndexedDBTodoRepository,
      },
      {
        ConversationRepository: APIConversationRepository,
        DatasourceRepository: APIDatasourceRepository,
        NotebookRepository: APINotebookRepository,
        OrganizationRepository: APIOrganizationRepository,
        ProjectRepository: APIProjectRepository,
        MessageRepository: APIMessageRepository,
        UsageRepository: APIUsageRepository,
      },
    ] = await Promise.all([
      import('@qwery/repository-indexed-db'),
      import('./index'),
    ]);

    return {
      user: new IndexedDBUserRepository(), // User stays local for now
      organization: new APIOrganizationRepository(),
      project: new APIProjectRepository(),
      datasource: new APIDatasourceRepository(),
      notebook: new APINotebookRepository(),
      conversation: new APIConversationRepository(),
      message: new APIMessageRepository(),
      usage: new APIUsageRepository(),
      todo: new IndexedDBTodoRepository(),
    };
  }

  // Default to IndexedDB (client-side storage)
  const {
    UserRepository: IndexedDBUserRepository,
    OrganizationRepository: IndexedDBOrganizationRepository,
    ProjectRepository: IndexedDBProjectRepository,
    DatasourceRepository: IndexedDBDatasourceRepository,
    NotebookRepository: IndexedDBNotebookRepository,
    ConversationRepository: IndexedDBConversationRepository,
    MessageRepository: IndexedDBMessageRepository,
    UsageRepository: IndexedDBUsageRepository,
    TodoRepository: IndexedDBTodoRepository,
  } = await import('@qwery/repository-indexed-db');

  return {
    user: new IndexedDBUserRepository(),
    organization: new IndexedDBOrganizationRepository(),
    project: new IndexedDBProjectRepository(),
    datasource: new IndexedDBDatasourceRepository(),
    notebook: new IndexedDBNotebookRepository(),
    conversation: new IndexedDBConversationRepository(),
    message: new IndexedDBMessageRepository(),
    usage: new IndexedDBUsageRepository(),
    todo: new IndexedDBTodoRepository(),
  };
}
