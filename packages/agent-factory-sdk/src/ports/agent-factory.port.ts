import { AgentSession } from '../domain/agent-session.type';
import {
  CommandId,
  PhaseId,
  StateConstructor,
  StateData,
  StateMachineDefinition,
} from '../domain/state-machine.type';
import { type ToolAny } from '../domain/tool.type';
import { IAIModelProvider, IAiModel } from './ai-model.port';
import { IAgentMemory } from './agent-memory.port';
import { IAgentWorkspace } from './agent-workspace.port';
import { IAgentSideEffects } from './agent-side-effects.port';
import { IAgentRunner } from './agent-runner.port';

export type AgentFactoryDependencies = {
  aiModelPort: IAIModelProvider;
  memory?: IAgentMemory;
  workspace?: IAgentWorkspace;
  sideEffects?: IAgentSideEffects;
};

export type AgentConstructor<T extends StateData> = {
  conversationId?: string;
  name: string;
  description?: string;
  system?: string;
  tools?: Map<string, ToolAny>;
  model: IAiModel;
  stateMachine?: StateMachineDefinition<T>;
  state?: StateConstructor<T>;
  session?: AgentSession;
  onTransition?: (
    session: AgentSession,
    from: PhaseId,
    to: PhaseId,
    command: CommandId,
  ) => void | Promise<void>;
  onTerminalState?: (
    session: AgentSession,
    phase: PhaseId,
  ) => void | Promise<void>;
};

export abstract class IAgentFactory {
  constructor(protected readonly dependencies: AgentFactoryDependencies) {}

  abstract buildAgent<T extends StateData, TMessage = unknown>(
    opts: AgentConstructor<T> & { model: unknown },
    dependencies?: {
      memory?: IAgentMemory;
      workspace?: IAgentWorkspace;
      sideEffects?: IAgentSideEffects;
    },
  ): IAgentRunner<TMessage, T>;
}
