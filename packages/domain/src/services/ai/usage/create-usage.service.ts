import { Code } from '../../../common/code';
import { DomainException } from '../../../exceptions';
import { UsageEntity, Usage } from '../../../entities';
import {
  IConversationRepository,
  IProjectRepository,
  IUsageRepository,
} from '../../../repositories';
import {
  CreateUsageInput,
  UsageOutput,
  CreateUsageUseCase,
} from '../../../usecases';

export class CreateUsageService implements CreateUsageUseCase {
  constructor(
    private readonly usageRepository: IUsageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  public async execute({
    input,
    conversationSlug,
  }: {
    input: CreateUsageInput;
    conversationSlug: string;
  }): Promise<UsageOutput> {
    const conversation =
      (await this.conversationRepository.findBySlug(conversationSlug)) ??
      (await this.conversationRepository.findById(conversationSlug));
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with slug or id '${conversationSlug}' not found`,
        data: { conversationSlug },
      });
    }

    const project = await this.projectRepository.findById(
      conversation.projectId,
    );
    if (!project) {
      throw DomainException.new({
        code: Code.PROJECT_NOT_FOUND_ERROR,
        overrideMessage: `Project with id '${conversation.projectId}' not found`,
        data: { projectId: conversation.projectId },
      });
    }

    const usageEntity = UsageEntity.new({
      ...input,
      id: input.id ?? crypto.randomUUID(),
      conversationId: conversation.id,
      projectId: conversation.projectId,
      organizationId: project.organizationId,
    });

    const usage = await this.usageRepository.create(
      usageEntity as unknown as Usage,
    );
    return UsageOutput.new(usage);
  }
}
