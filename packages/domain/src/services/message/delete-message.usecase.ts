import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IMessageRepository } from '../../repositories';
import { DeleteMessageUseCase } from '../../usecases';

export class DeleteMessageService implements DeleteMessageUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(id: string): Promise<boolean> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw DomainException.new({
        code: Code.MESSAGE_NOT_FOUND_ERROR,
        overrideMessage: `Message with id '${id}' not found`,
        data: { messageId: id },
      });
    }

    return await this.messageRepository.delete(id);
  }
}
