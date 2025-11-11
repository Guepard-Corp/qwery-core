import type { DatasourceResultSet } from './model';

export abstract class DatasourceDriver {
  constructor(
    protected readonly name: string,
    protected readonly config: Record<string, unknown> | string,
  ) {}

  abstract getCurrentSchema(): Promise<string | null>;

  abstract testConnection(): Promise<boolean>;
  abstract connect(): Promise<void>;
  abstract close(): void;

  abstract query(query: string): Promise<DatasourceResultSet>;
}
