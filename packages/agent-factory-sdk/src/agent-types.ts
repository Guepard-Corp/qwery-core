import type {
  Compute,
  Datasource,
  LLMProvider,
  Logger,
  OntologyProvider,
  SchemaRetriever,
  Todo,
  ToolEvent,
  UsageInput,
} from '@qwery/domain';
import type { ModelMessage } from 'ai';
import type { AgentSpec } from './agent-spec';
import type { BackgroundJobRegistry } from './background-jobs';
import type { AttachedDatasourceSummary, LocalAppSummary, SkillSummary } from './system-prompt';
import type { TodoStore } from './todo-tools';
import type { ToolRegistryDeps } from './tool-registry';
import type { DatasourceSchemaProvider } from './tools/schema';

/**
 * Types shared between `agent-loop.ts` and `subagent.ts` — extracted so the
 * Agent tool can describe its options without creating a circular import.
 */

export interface AgentRunResult {
  text: string;
  usage: UsageInput & { totalTokens?: number };
  durationMs: number;
  finishReason: string | null;
}

export interface AgentRunOptions {
  messages: ModelMessage[];
  compute: Compute;
  llm: LLMProvider;
  logger: Logger;
  onToolEvent: (event: ToolEvent) => void;
  onToken: (delta: string) => void;
  datasources?: AttachedDatasourceSummary[];
  /** Native driver-introspected schema provider for the `schema` tool. */
  schemaProvider?: DatasourceSchemaProvider;
  /** Optional semantic-layer ontology port; enables the `validateQuery` tool. */
  ontologyProvider?: OntologyProvider;
  /** Optional semantic-layer retriever; enables the `searchSchema` tool. */
  schemaRetriever?: SchemaRetriever;
  apps?: LocalAppSummary[];
  skills?: SkillSummary[];
  agent?: AgentSpec;
  registry?: ToolRegistryDeps;
  subagents?: SubagentRunInfo[];
  onSubagentEvent?: (event: SubagentRunEvent) => void;
  /** Internal: when true, the `agent` tool is omitted to prevent recursion. */
  isSubagent?: boolean;
  loadedTools?: Set<string>;
  onLoadedToolsChange?: (names: string[]) => void;
  /** Session id for tying todos / background tasks. */
  sessionId?: string;
  /** Todo store shared with the UI; required for the todoWrite/Read tools. */
  todoStore?: TodoStore;
  /** Notified after todoWrite. */
  onTodosChange?: (todos: Todo[]) => void;
  /** Background-job registry shared across runAgent calls in the session. */
  backgroundJobs?: BackgroundJobRegistry;
  /** Hard model context window (e.g. 200000). Required for compaction to fire. */
  contextLimit?: number;
  /** Reserved output budget for compaction overflow detection (default 20k). */
  compactionReserved?: number;
  /** Rolling summary carried across turns (set by previous compaction). */
  previousSummary?: string;
  /** Notified when compaction runs so the caller can persist + show in UI. */
  onCompaction?: (event: CompactionEventPayload) => void;
  /** Disable compaction entirely (useful for tests). */
  disableCompaction?: boolean;
  /** Abort signal — when triggered, the in-flight LLM stream is cancelled. */
  signal?: AbortSignal;
  /** Resolve the attached datasource for tools that need native datasource context. */
  getAttachedDatasource?: () => Promise<Datasource | null>;
  /** Reveal encrypted datasource config when a tool must connect outside DuckDB. */
  revealDatasourceSecrets?: (datasource: Datasource) => Promise<Record<string, unknown>>;
}

export interface CompactionEventPayload {
  phase: 'prune-only' | 'prune-and-summary' | 'summary-only';
  prunedTokens: number;
  prunedParts: number;
  summary?: string;
  savedTokens: number;
  promptTokensBefore: number;
}

// Subagent-related types live here so subagent.ts doesn't need to import
// agent-loop.ts (which would create a cycle).

export type SubagentBase = 'data' | 'code';

export interface SubagentRunInfo {
  name: string;
  description: string;
  baseAgent: SubagentBase;
  tools?: string[];
  prompt: string;
  path: string;
}

export type SubagentRunEvent =
  | { kind: 'start'; name: string; task: string }
  | { kind: 'tool'; name: string; tool: ToolEvent }
  | {
      kind: 'finish';
      name: string;
      durationMs: number;
      usage: AgentRunResult['usage'];
      text: string;
    }
  | { kind: 'error'; name: string; error: string };
