import type { Repositories } from '@qwery/domain/repositories';
import type {
  IUserRepository,
  ITodoRepository,
} from '@qwery/domain/repositories';

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
