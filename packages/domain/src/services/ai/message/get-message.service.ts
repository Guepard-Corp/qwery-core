import { Code } from '../../../common/code';
import { DomainException } from '../../../exceptions';
import { IMessageRepository } from '../../../repositories';
import { MessageOutput, GetMessageUseCase } from '../../../usecases';

export class GetMessageService implements GetMessageUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(id: string): Promise<MessageOutput> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw DomainException.new({
        code: Code.MESSAGE_NOT_FOUND_ERROR,
        overrideMessage: `Message with id '${id}' not found`,
        data: { id },
      });
    }
    return MessageOutput.new(message);
  }
}
