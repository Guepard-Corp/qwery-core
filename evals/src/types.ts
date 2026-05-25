import type { AttachedDatasourceSummary } from '@qwery/agent-factory-sdk';
import type { Compute, DatasourceMetadata, ToolEvent } from '@qwery/domain';

/** What one agent run produced — the material every assertion inspects. */
export interface RunOutcome {
  text: string;
  finishReason: string | null;
  trace: ToolEvent[];
  /** The DuckDB instance the run used, for golden re-checks against the fixture. */
  compute: Compute;
}

export interface SchemaEntry {
  datasourceId: string;
  datasourceName: string;
  metadata: DatasourceMetadata;
}

export interface Scenario {
  name: string;
  /** Load the fixture data into the run's fresh DuckDB. */
  setup(compute: Compute): Promise<void>;
  /** Datasource summary surfaced in the system prompt. */
  datasources: AttachedDatasourceSummary[];
  /** Native schema returned by the `schema` tool. */
  schemas: SchemaEntry[];
  prompt: string;
  /** How many times to run (LLMs are stochastic; we score a pass-rate). */
  runs: number;
  /** Minimum pass-rate (0..1) for the scenario to pass. Safety scenarios use 1. */
  threshold: number;
  /** Is this single run a success? Inspect the trace, final text, and DuckDB. */
  check(outcome: RunOutcome): boolean | Promise<boolean>;
}

export interface ScenarioReport {
  name: string;
  runs: number;
  passes: number;
  passRate: number;
  threshold: number;
  passed: boolean;
}
