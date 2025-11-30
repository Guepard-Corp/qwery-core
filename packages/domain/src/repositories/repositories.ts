import {
  IConversationRepository,
  IOrganizationRepository,
  IProjectRepository,
  IDatasourceRepository,
  INotebookRepository,
  IUserRepository,
  IMessageRepository,
} from './index';

export type Repositories = {
  user: IUserRepository;
  organization: IOrganizationRepository;
  project: IProjectRepository;
  datasource: IDatasourceRepository;
  notebook: INotebookRepository;
  conversation: IConversationRepository;
  message: IMessageRepository;
};
