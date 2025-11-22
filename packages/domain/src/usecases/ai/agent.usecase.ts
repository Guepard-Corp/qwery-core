import { AgentOutput, InitializeAgentInput } from '../dto';
import { UseCase } from '../usecase';
import { ApplyAgentCommandInput, ApplyAgentCommandOutput } from '../dto/ai';

export type InitializeAgentUseCase = UseCase<InitializeAgentInput, AgentOutput>;

export type ExecuteAgentUseCase = UseCase<InitializeAgentInput, AgentOutput>;

export type ApplyAgentCommandUseCase = UseCase<
  ApplyAgentCommandInput,
  ApplyAgentCommandOutput
>;
