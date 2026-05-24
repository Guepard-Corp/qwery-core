import {
  createUsage as buildUsage,
  type CreateUsageInput,
  type IUsageRepository,
  type Usage,
} from '@qwery/domain';

export interface RecordUsageDeps {
  usageRepo: IUsageRepository;
}

export async function recordUsage(deps: RecordUsageDeps, input: CreateUsageInput): Promise<Usage> {
  const entity = buildUsage(input);
  return deps.usageRepo.create(entity);
}
