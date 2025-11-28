import { beforeEach, describe, expect, it } from 'vitest';
import { ApplyAgentCommandService } from '../../src/services';
import type { AgentSession } from '../../src/entities';
import type { StateMachineDefinition } from '../../src/entities';
import { ApplyAgentCommandInput } from '../../src/usecases';
import {
  MockAgentSessionRepository,
  MockStateMachineRepository,
  MockAgentSideEffects,
} from '../mocks/agent.mock';

describe('ApplyAgentCommandService', () => {
  let agentSessionRepository: MockAgentSessionRepository;
  let stateMachineRepository: MockStateMachineRepository;
  let agentSideEffects: MockAgentSideEffects;
  let service: ApplyAgentCommandService;

  beforeEach(() => {
    agentSessionRepository = new MockAgentSessionRepository();
    stateMachineRepository = new MockStateMachineRepository();
    agentSideEffects = new MockAgentSideEffects();
    service = new ApplyAgentCommandService(
      agentSessionRepository,
      stateMachineRepository,
      agentSideEffects,
    );
  });

  describe('state machine transitions', () => {
    it('should transition from idle to working when start command is applied', async () => {
      // Create a simple state machine: idle -> (start) -> working -> (complete) -> done
      const stateMachine: StateMachineDefinition = {
        id: 'fsm.simple.v1',
        name: 'Simple State Machine',
        initialPhase: 'idle',
        terminalPhases: new Set(['done']),
        transitions: [
          { from: 'idle', command: 'start', to: 'working' },
          { from: 'working', command: 'complete', to: 'done' },
        ],
      };

      await stateMachineRepository.create(stateMachine);

      // Create an agent session in the initial phase
      const session: AgentSession = {
        sessionId: 'session-1',
        agentId: 'agent.test',
        fsmId: 'fsm.simple.v1',
        phase: 'idle',
        taskId: 'task-1',
        retryCount: 0,
        metadata: {},
      };

      await agentSessionRepository.create(session);

      // Apply the start command
      const input = ApplyAgentCommandInput.new('session-1', 'start');
      const output = await service.execute(input);

      // Validate the transition occurred
      const updatedSession = await agentSessionRepository.findById('session-1');
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.phase).toBe('working');
      expect(output.session.phase).toBe('working');
      expect(output.isTerminal).toBe(false);

      // Validate side effects were called for the transition
      expect(agentSideEffects.onTransitionCalls).toHaveLength(1);
      expect(agentSideEffects.onTransitionCalls[0]).toEqual({
        session: expect.objectContaining({
          sessionId: 'session-1',
          phase: 'working',
        }),
        from: 'idle',
        to: 'working',
        command: 'start',
      });
      expect(agentSideEffects.onTerminalStateCalls).toHaveLength(0);

      // Apply the complete command
      const input2 = ApplyAgentCommandInput.new('session-1', 'complete');
      const output2 = await service.execute(input2);

      // Validate the transition occurred
      const updatedSession2 =
        await agentSessionRepository.findById('session-1');
      expect(updatedSession2).toBeDefined();
      expect(updatedSession2?.phase).toBe('done');
      expect(output2.session.phase).toBe('done');
      expect(output2.isTerminal).toBe(true);

      // Validate side effects were called for both transitions
      expect(agentSideEffects.onTransitionCalls).toHaveLength(2);
      expect(agentSideEffects.onTransitionCalls[1]).toEqual({
        session: expect.objectContaining({
          sessionId: 'session-1',
          phase: 'done',
        }),
        from: 'working',
        to: 'done',
        command: 'complete',
      });

      // Validate terminal state side effect was called
      expect(agentSideEffects.onTerminalStateCalls).toHaveLength(1);
      expect(agentSideEffects.onTerminalStateCalls[0]).toEqual({
        session: expect.objectContaining({
          sessionId: 'session-1',
          phase: 'done',
        }),
        phase: 'done',
      });
    });
  });
});
