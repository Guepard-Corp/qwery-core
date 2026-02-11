import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import {
  Message,
  type MessageContent,
  type MessageMetadata,
  MessageRole,
} from '../../../entities';

@Exclude()
export class MessageOutput {
  @Expose()
  public id!: string;
  @Expose()
  public conversationId!: string;
  @Expose()
  public content!: MessageContent;
  @Expose()
  public role!: MessageRole;
  @Expose()
  public metadata!: MessageMetadata;
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
  content: MessageContent;
  role: MessageRole;
  metadata?: MessageMetadata;
  createdBy: string;
};

export type UpdateMessageInput = {
  id: string;
  content?: MessageContent;
  metadata?: MessageMetadata;
  updatedBy: string;
};
