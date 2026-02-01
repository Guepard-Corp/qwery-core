import { Repositories } from '@qwery/domain/repositories';

// Detect if we're in a server/API context (Node.js environment)
const IS_SERVER = typeof process !== 'undefined' && process.env !== undefined;

const DATABASE_PROVIDER = (import.meta.env?.VITE_DATABASE_PROVIDER ||
  'indexed-db') as 'indexed-db' | 'sqlite';

export async function createRepositories(): Promise<Repositories> {
  // When used in API routes (server context), always use SQLite repositories directly
  if (IS_SERVER) {
    const {
      UserRepository,
      ConversationRepository,
      DatasourceRepository,
      NotebookRepository,
      OrganizationRepository,
      ProjectRepository,
      MessageRepository,
      UsageRepository,
      TodoRepository,
    } = await import('@qwery/repository-sqlite');

    const DB_PATH = process.env.VITE_DATABASE_PATH || undefined;

    return {
      user: new UserRepository(DB_PATH),
      organization: new OrganizationRepository(DB_PATH),
      project: new ProjectRepository(DB_PATH),
      datasource: new DatasourceRepository(DB_PATH),
      notebook: new NotebookRepository(DB_PATH),
      conversation: new ConversationRepository(DB_PATH),
      message: new MessageRepository(DB_PATH),
      usage: new UsageRepository(DB_PATH),
      todo: new TodoRepository(DB_PATH),
    };
  }

  // Browser context: use IndexedDB or API repositories based on STORAGE_ADAPTER
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
