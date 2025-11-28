import {
  ConversationRepository,
  DatasourceRepository,
  NotebookRepository,
  OrganizationRepository,
  ProjectRepository,
} from '@qwery/repository-sqlite';

const DB_PATH = process.env.DATABASE_PATH || undefined;

// Singleton instances to reuse database connections
let datasourceRepository: DatasourceRepository | null = null;
let notebookRepository: NotebookRepository | null = null;
let organizationRepository: OrganizationRepository | null = null;
let projectRepository: ProjectRepository | null = null;
let conversationRepository: ConversationRepository | null = null;

export function getDatasourceRepository(): DatasourceRepository {
  if (!datasourceRepository) {
    datasourceRepository = new DatasourceRepository(DB_PATH);
  }
  return datasourceRepository;
}

export function getNotebookRepository(): NotebookRepository {
  if (!notebookRepository) {
    notebookRepository = new NotebookRepository(DB_PATH);
  }
  return notebookRepository;
}

export function getOrganizationRepository(): OrganizationRepository {
  if (!organizationRepository) {
    organizationRepository = new OrganizationRepository(DB_PATH);
  }
  return organizationRepository;
}

export function getProjectRepository(): ProjectRepository {
  if (!projectRepository) {
    projectRepository = new ProjectRepository(DB_PATH);
  }
  return projectRepository;
}

export function getConversationRepository(): ConversationRepository {
  if (!conversationRepository) {
    conversationRepository = new ConversationRepository(DB_PATH);
  }
  return conversationRepository;
}
