import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Conversation } from '../../../entities';

@Exclude()
export class ConversationOutput {
  @Expose()
  public id!: string;
  @Expose()
  public title!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public taskId!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public datasources!: string[];
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

  public static new(conversation: Conversation): ConversationOutput {
    return plainToClass(ConversationOutput, conversation);
  }
}

export type CreateConversationInput = {
  title: string;
  seedMessage: string;
  projectId: string;
  taskId: string;
  datasources: string[];
  createdBy: string;
};

export type UpdateConversationInput = {
  id: string;
  title?: string;
  datasources?: string[];
  updatedBy: string;
};
