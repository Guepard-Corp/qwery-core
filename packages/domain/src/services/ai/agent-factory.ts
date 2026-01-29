import { Tool, ToolInput } from '../../entities';
import { StateData } from '../../entities';
import {
  AgentConstructor,
  AgentFactoryDependencies,
  AgentFactoryPort,
  AgentRunner,
} from '../../ports';
import { z } from 'zod/v3';

export class AgentFactory extends AgentFactoryPort {
  constructor(dependencies: AgentFactoryDependencies) {
    super(dependencies);
  }

  buildAgent<T extends StateData>(opts: AgentConstructor<T>): AgentRunner<T> {
    return new AgentRunner<T>(opts, this.dependencies);
  }

  buildChatAgent<T extends StateData>(
    opts: AgentConstructor<T>,
  ): AgentRunner<T> {
    return new AgentRunner<T>(opts, this.dependencies);
  }

  async createTool<TName extends string, TInput extends ToolInput, TOutput>({
    name,
    description,
    parameters,
    handler,
  }: {
    name: TName;
    description?: string;
    parameters?: TInput;
    handler: (input: z.infer<TInput>) => Promise<TOutput>;
  }): Promise<Tool<TName, TInput, TOutput>> {
    return {
      name,
      description,
      parameters,
      handler: async (input: z.infer<TInput>) => {
        return await handler(input);
      },
    };
  }

  static async createTool<
    TName extends string,
    TInput extends ToolInput,
    TOutput,
  >({
    name,
    description,
    parameters,
    handler,
  }: {
    name: TName;
    description?: string;
    parameters?: TInput;
    handler: (input: z.infer<TInput>) => Promise<TOutput>;
  }): Promise<Tool<TName, TInput, TOutput>> {
    return {
      name,
      description,
      parameters,
      handler: async (input: z.infer<TInput>) => {
        return await handler(input);
      },
    };
  }
}
