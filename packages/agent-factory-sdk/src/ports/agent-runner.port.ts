import { CommandId, StateData } from '../domain/state-machine.type';

export abstract class IAgentRunner<
  TMessage = unknown,
  _TStateData extends StateData = StateData,
> {
  abstract name: string;
  abstract description: string;

  abstract run(input: TMessage[], command?: CommandId): Promise<TMessage[]>;

  abstract runStream(
    input: TMessage[],
    command?: CommandId,
  ): AsyncGenerator<TMessage[]>;

  abstract getStreamResponse(
    input: TMessage[],
    command?: CommandId,
  ): Promise<Response>;
}
