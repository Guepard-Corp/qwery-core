import { type CommandId, type PhaseId } from '../domain/state-machine.type';
import { type AgentSession } from '../domain/agent-session.type';

export abstract class IAgentSideEffects {
  abstract onTransition(
    session: AgentSession,
    from: PhaseId,
    to: PhaseId,
    command: CommandId,
  ): Promise<void>;

  abstract onTerminalState(
    session: AgentSession,
    phase: PhaseId,
  ): Promise<void>;
}
