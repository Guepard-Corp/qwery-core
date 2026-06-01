import type { Todo } from './entities/todo.entity';
import type { QueryResult, QuerySchema } from './query-result';
import type { QueryValidationViolation } from './services/obqc-validate';

export type ToolName =
  | 'schema'
  | 'runQuery'
  | 'describeQuery'
  | 'present'
  | 'bash'
  | 'read'
  | 'write'
  | 'edit'
  | 'agent'
  | 'taskStatus'
  | 'todoWrite'
  | 'todoRead'
  | 'validateQuery'
  | 'searchSchema'
  | 'expandSchema'
  | 'detectDbEngine'
  | 'getTopSlowQueries'
  | 'explainQueryPlan'
  | 'compareQueryRewrite'
  | 'getIndexHealth'
  | 'getTableHealth'
  | 'getInfraRuntimeSignals'
  | 'getRecentDbLogs'
  | 'getLockAndBlockingAnalysis'
  | 'getStatisticsHealth'
  | 'getBloatEstimates'
  | 'getReplicationHealth'
  | 'validateRemediationInGfsCli';

export type ToolResult =
  | { kind: 'schema'; target: string; schema: QuerySchema }
  | { kind: 'runQuery'; sql: string; row: Record<string, unknown>; result: QueryResult }
  | { kind: 'describeQuery'; sql: string; schema: QuerySchema }
  | { kind: 'present'; sql: string; template: string; rendered: string; result: QueryResult }
  | { kind: 'bash'; command: string; stdout: string; stderr: string; exitCode: number }
  | { kind: 'read'; path: string; bytes: number; truncated: boolean; preview: string }
  | { kind: 'write'; path: string; bytes: number }
  | {
      kind: 'edit';
      path: string;
      appliedEdits: number;
      bytesBefore: number;
      bytesAfter: number;
      diff: string;
    }
  | { kind: 'agent'; subagent: string; task: string; text: string; durationMs: number; tokens: number }
  | { kind: 'taskStatus'; taskId: string; state: 'running' | 'completed' | 'error'; text?: string }
  | { kind: 'todoWrite'; todos: Todo[] }
  | { kind: 'todoRead'; todos: Todo[] }
  | {
      kind: 'validateQuery';
      sql: string;
      available: boolean;
      valid: boolean;
      violations: QueryValidationViolation[];
    }
  | { kind: 'searchSchema'; query: string; available: boolean; tables: number }
  | { kind: 'expandSchema'; available: boolean; requested: number; found: number }
  | { kind: 'dbAudit'; tool: ToolName; summary: string; result: unknown }
  | { kind: 'error'; message: string };

export interface ToolEvent {
  id: string;
  name: ToolName;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'done' | 'error';
  input: unknown;
  output?: ToolResult;
}
