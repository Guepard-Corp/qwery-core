import { Conversation } from '../../entities';
import { RepositoryPort } from '../base-repository.port';

export abstract class IConversationRepository extends RepositoryPort<
  Conversation,
  string
> {
  public abstract findByProjectId(projectId: string): Promise<Conversation[]>;

  public abstract findByTaskId(taskId: string): Promise<Conversation[]>;
}
