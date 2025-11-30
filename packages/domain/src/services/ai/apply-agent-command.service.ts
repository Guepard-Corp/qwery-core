import { Code } from '../../common/code';
import { DomainException } from '../../exceptions/domain-exception';
import { TransitionDefinition } from '../../entities';
import {
  IAgentSessionRepository,
  IStateMachineRepository,
} from '../../repositories';
import {
  ApplyAgentCommandInput,
  ApplyAgentCommandOutput,
  ApplyAgentCommandUseCase,
} from '../../usecases';
import { AgentSideEffectsPort } from '../../ports';

export class ApplyAgentCommandService implements ApplyAgentCommandUseCase {
  constructor(
    private readonly agentSessionRepository: IAgentSessionRepository,
    private readonly stateMachineRepository: IStateMachineRepository,
    private readonly agentSideEffects: AgentSideEffectsPort,
  ) {}

  public async execute(
    input: ApplyAgentCommandInput,
  ): Promise<ApplyAgentCommandOutput> {
    const agentSession = await this.agentSessionRepository.findById(
      input.sessionId,
    );
    if (!agentSession) {
      throw DomainException.new({
        code: Code.AGENT_SESSION_NOT_FOUND_ERROR,
        overrideMessage: `Agent session with id '${input.sessionId}' not found`,
        data: { sessionId: input.sessionId },
      });
    }

    const stateMachine = await this.stateMachineRepository.findById(
      agentSession.fsmId,
    );
    if (!stateMachine) {
      throw DomainException.new({
        code: Code.STATE_MACHINE_NOT_FOUND_ERROR,
        overrideMessage: `State machine with id '${agentSession.fsmId}' not found`,
        data: { fsmId: agentSession.fsmId },
      });
    }

    // Find the transition from current phase with the given command
    const transition = stateMachine.transitions.find(
      (t: TransitionDefinition) =>
        t.from === agentSession.phase && t.command === input.command,
    );

    if (!transition) {
      throw DomainException.new({
        code: Code.INVALID_STATE_TRANSITION_ERROR,
        overrideMessage: `No transition found from phase '${agentSession.phase}' with command '${input.command}'`,
        data: { phase: agentSession.phase, command: input.command },
      });
    }

    // Update the session phase
    const updatedSession: typeof agentSession = {
      ...agentSession,
      phase: transition.to,
    };

    await this.agentSessionRepository.update(updatedSession);

    // Execute side effects for the transition
    await this.agentSideEffects.onTransition(
      updatedSession,
      agentSession.phase,
      transition.to,
      input.command,
    );

    // Check if the new phase is terminal
    const isTerminal = stateMachine.terminalPhases.has(transition.to);

    // Execute side effects for terminal state if applicable
    if (isTerminal) {
      await this.agentSideEffects.onTerminalState(
        updatedSession,
        transition.to,
      );
    }

    return ApplyAgentCommandOutput.new(updatedSession, isTerminal);
  }
}
