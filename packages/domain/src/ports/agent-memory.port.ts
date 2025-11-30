export abstract class AgentMemoryPort {
  abstract initialize(name: string): Promise<void>;

  abstract setItem(key: string, value: unknown): Promise<void>;

  abstract getItem(key: string): Promise<unknown>;

  abstract removeItem(key: string): Promise<void>;

  abstract clear(): Promise<void>;

  abstract keys(): Promise<string[]>;

  abstract values(): Promise<unknown[]>;

  abstract entries(): Promise<[string, unknown][]>;
}
