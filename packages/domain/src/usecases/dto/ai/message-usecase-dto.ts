import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Message, MessageRole } from '../../../entities';

@Exclude()
export class MessageOutput {
  @Expose()
  public id!: string;
  @Expose()
  public conversationId!: string;
  @Expose()
  public content!: Record<string, unknown>;
  @Expose()
  public role!: MessageRole;
  @Expose()
  public metadata!: Record<string, unknown>;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;

  public static new(message: Message): MessageOutput {
    return plainToClass(MessageOutput, message);
  }
}

export type CreateMessageInput = {
  content: Record<string, unknown>;
  role: MessageRole;
  metadata?: Record<string, unknown>;
  createdBy: string;
};

export type UpdateMessageInput = {
  id: string;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  updatedBy: string;
};
