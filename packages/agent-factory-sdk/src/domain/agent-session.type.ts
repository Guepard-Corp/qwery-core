import { PhaseId } from './state-machine.type';

export interface AgentSession {
  conversationId: string;
  sessionId: string;
  agentId: string; // "agent.coder", "agent.manager", etc.
  fsmId: string; // "fsm.coder.v1"
  phase: PhaseId; // current phase
  taskId: string;

  // whatever else you need:
  retryCount: number;
  metadata: Record<string, unknown>;
}
