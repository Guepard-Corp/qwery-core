export abstract class AgentWorkspacePort {
  abstract initialize(name: string): Promise<void>;

  //
  abstract start(): Promise<void>;

  //
  abstract stop(): Promise<void>;

  //
  abstract restart(): Promise<void>;

  //
  abstract pause(): Promise<void>;

  //
  abstract resume(): Promise<void>;

  //
  abstract terminate(): Promise<void>;

  //
  abstract getStatus(): Promise<string>;

  //
  abstract run(command: string): Promise<string>;

  //
  abstract getLogs(): Promise<string[]>;

  //
  abstract getErrors(): Promise<string[]>;

  //
  abstract getWarnings(): Promise<string[]>;

  //
  abstract getInfo(): Promise<string[]>;

  //
  abstract getDebug(): Promise<string[]>;

  //
  abstract getTrace(): Promise<string[]>;

  //
  abstract getVerbose(): Promise<string[]>;
}
