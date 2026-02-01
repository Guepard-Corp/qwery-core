import { Repositories } from '@qwery/domain/repositories';
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

const storageDir =
  process.env.QWERY_STORAGE_DIR ??
  process.env.VITE_DATABASE_PATH ??
  process.env.DATABASE_PATH;

if (storageDir) {
  setStorageDir(storageDir);
}

export async function createRepositories(): Promise<Repositories> {
  return {
    user: new UserRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    datasource: new DatasourceRepository(),
    notebook: new NotebookRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    usage: new UsageRepository(),
    todo: new TodoRepository(),
  };
}
