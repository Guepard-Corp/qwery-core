import type { Usage } from '../entities/usage.entity';
import { RepositoryPort } from './base-repository';

export abstract class IUsageRepository extends RepositoryPort<Usage, string> {
  public abstract findBySessionId(sessionId: string): Promise<Usage[]>;
}
