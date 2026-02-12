import type { Repositories } from '@qwery/domain/repositories';
import {
  UserRepository,
  ConversationRepository,
  DatasourceRepository,
  NotebookRepository,
  OrganizationRepository,
  ProjectRepository,
  MessageRepository,
  UsageRepository,
  TodoRepository,
  setStorageDir,
} from '@qwery/repository-file';

setStorageDir(process.env.QWERY_STORAGE_DIR || 'qwery.db');

let repositoriesPromise: Promise<Repositories> | undefined;

export async function createRepositories(): Promise<Repositories> {
  repositoriesPromise ??= Promise.resolve({
    user: new UserRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    datasource: new DatasourceRepository(),
    notebook: new NotebookRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    usage: new UsageRepository(),
    todo: new TodoRepository(),
  });
  return repositoriesPromise;
}

export function getRepositories(): Promise<Repositories> {
  return createRepositories();
}
