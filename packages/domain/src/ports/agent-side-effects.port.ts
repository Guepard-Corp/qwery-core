import { type CommandId, type PhaseId } from '../entities';
import { type AgentSession } from '../entities';

export abstract class AgentSideEffectsPort {
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
