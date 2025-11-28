import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Agent, type CommandId, type AgentSession } from '../../../entities';

@Exclude()
export class AgentOutput {
  @Expose()
  public id!: string;
  @Expose()
  public name!: string;
  @Expose()
  public description!: string;
  @Expose()
  public role!: string;
  @Expose()
  public capabilities!: string[];
  @Expose()
  public policies!: string[];
  @Expose()
  public createdAt!: Date;
  @Expose()
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;

  public static new(agent: Agent): AgentOutput {
    return plainToClass(AgentOutput, agent);
  }
}

@Exclude()
export class ApplyAgentCommandInput {
  @Expose()
  public sessionId!: string;
  @Expose()
  public command!: CommandId;

  public static new(
    sessionId: string,
    command: CommandId,
  ): ApplyAgentCommandInput {
    return plainToClass(ApplyAgentCommandInput, { sessionId, command });
  }
}

@Exclude()
export class ApplyAgentCommandOutput {
  @Expose()
  public session!: AgentSession;

  @Expose()
  public isTerminal!: boolean;

  public static new(
    session: AgentSession,
    isTerminal: boolean,
  ): ApplyAgentCommandOutput {
    return plainToClass(ApplyAgentCommandOutput, { session, isTerminal });
  }
}

export type InitializeAgentInput = {
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  policies: string[];
};
