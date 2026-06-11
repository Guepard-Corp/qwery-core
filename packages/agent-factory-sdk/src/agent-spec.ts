import type { ToolName } from '@qwery/domain';
import { DB_PERFORMANCE_AUDIT_PROMPT } from './prompts/db-performance-audit.prompt';
import { SLOW_QUERY_OPTIMIZER_PROMPT } from './prompts/slow-query-optimizer.prompt';

export type AgentId = 'data' | 'code' | 'db-performance-audit' | 'slow-query-optimizer';

/** Reasoning effort forwarded to OpenAI/Azure reasoning models (GPT-5 / o-series). */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export interface AgentSpec {
  id: AgentId;
  label: string;
  /** Tool names this agent is allowed to call. */
  tools: ToolName[];
  /**
   * Generalist agents augment the shared base prompt: this text is prepended,
   * ahead of the dynamic context blocks. Mutually exclusive with
   * `systemPrompt`. Used by `data` / `code`.
   */
  promptPreamble?: string;
  /**
   * Specialist agents own their entire system message. When set, this *replaces*
   * the shared base prompt (the dynamic context blocks — datasources, schema,
   * subagents — are still prepended). Mirrors how db-audit ran its agents, so
   * generic instructions like "keep replies short" never leak in. Mutually
   * exclusive with `promptPreamble`. Used by the DB-audit / optimizer agents.
   */
  systemPrompt?: string;
  /**
   * Run the agent's ad-hoc `runQuery`/`present`/`describeQuery` SQL against the
   * attached source engine (native PostgreSQL) rather than the DuckDB compute.
   * Set for the PostgreSQL-specialist agents, whose SQL relies on catalog
   * functions DuckDB lacks; non-PostgreSQL datasources fall back to DuckDB.
   */
  prefersSourceEngine?: boolean;
  /**
   * Override the provider's reasoning effort for this agent (OpenAI/Azure
   * reasoning models only). Lower effort cuts reasoning-token usage per step —
   * useful to keep a heavy, many-step agent under a tokens-per-minute quota.
   * Unset means the provider default applies.
   */
  reasoningEffort?: ReasoningEffort;
  /** Heuristic keywords that suggest this agent should handle a prompt. */
  routingKeywords: RegExp[];
  /**
   * Layout the CLI switches to when this agent is pinned. `'focus'` is the
   * full-screen, one-pane-at-a-time view (toggled with Ctrl+B); `'split'` is
   * the default side-by-side chat/results view. The audit and optimizer agents
   * default to `'focus'` so their long reports get the whole screen. Unset
   * leaves the current layout untouched.
   */
  defaultLayoutMode?: 'focus' | 'split';
}

export const DataAgentSpec: AgentSpec = {
  id: 'data',
  label: 'DataAgent',
  tools: [
    'schema',
    'searchSchema',
    'expandSchema',
    'runQuery',
    'describeQuery',
    'present',
    'validateQuery',
    'read',
    'bash',
    'agent',
    'taskStatus',
    'todoWrite',
    'todoRead',
  ],
  promptPreamble: `You are the DataAgent. Your job is to answer the user's data questions by querying attached datasources via the privacy-safe SQL tools (\`schema\`, \`runQuery\`, \`describeQuery\`, \`present\`). You never see row-level data. Use \`read\` only for code/config files, never for data files (csv/parquet/json/sqlite). Use \`bash\` for shell utilities, never to cat data files. If the user asks you to build or modify an app, suggest switching to the CodingAgent via /code.`,
  routingKeywords: [
    /\b(query|select|count|sum|avg|min|max|aggregate|group by)\b/i,
    /\b(table|column|row|schema|database|datasource)\b/i,
    /\b(combien|combien de|count of|how many)\b/i,
    /\b(top|bottom|moyenne|average|median)\b/i,
    /\.(csv|parquet|json|sqlite|db)\b/i,
  ],
};

export const CodingAgentSpec: AgentSpec = {
  id: 'code',
  label: 'CodingAgent',
  tools: [
    'read',
    'write',
    'edit',
    'bash',
    'schema',
    'describeQuery',
    'agent',
    'taskStatus',
    'todoWrite',
    'todoRead',
  ],
  promptPreamble:
    'You are the CodingAgent. Your job is to build and modify deliverables (apps, scripts, configs) using `read`, `edit`, `write`, and `bash`. Prefer `edit` over `write` when modifying an existing file — `write` replaces the entire file. Materialize apps under `apps/<slug>/` and never paste full code in your chat reply. You may inspect datasource schemas via `schema` / `describeQuery` (privacy-safe) when an app needs to be designed against real columns. If the user asks a pure analytical question (no app, no code), suggest switching to the DataAgent via /data.',
  routingKeywords: [
    /\b(app|application|dashboard|page|site|website|script|code)\b/i,
    /\b(fix|update|refactor|rewrite|build|create|generate|implement|design)\b/i,
    /\b(html|css|tsx|jsx|react|vue|svelte|bun|node|python)\b/i,
    /\b(file|fichier|dossier|directory)\b/i,
    /\bapps?\/[a-z0-9-]+/i,
  ],
};

const DbAuditTools: ToolName[] = [
  'schema',
  'detectDbEngine',
  'getTopSlowQueries',
  'explainQueryPlan',
  'getIndexHealth',
  'getTableHealth',
  'getInfraRuntimeSignals',
  'getRecentDbLogs',
  'getLockAndBlockingAnalysis',
  'getStatisticsHealth',
  'getBloatEstimates',
  'getReplicationHealth',
  'validateRemediationInGfsCli',
  'validateQuery',
  'runQuery',
  'describeQuery',
  'present',
  'agent',
  'taskStatus',
];

export const DbPerformanceAuditAgentSpec: AgentSpec = {
  id: 'db-performance-audit',
  label: 'DB Audit',
  tools: DbAuditTools,
  systemPrompt: DB_PERFORMANCE_AUDIT_PROMPT,
  prefersSourceEngine: true,
  // The audit is the heaviest agent (many steps, large context); medium effort
  // keeps it under the deployment's tokens-per-minute quota. The optimizer keeps
  // the provider default (high) — its plan reasoning benefits from it.
  reasoningEffort: 'medium',
  defaultLayoutMode: 'focus',
  routingKeywords: [
    /\b(database|postgres|postgresql|db)\s+(audit|health|performance)\b/i,
    /\b(audit|bloat|replication|locks?|blocking|indexes?|statistics|vacuum|analyze)\b/i,
    /\bpg_stat_statements|pg_stat_activity|pg_locks\b/i,
  ],
};

export const SlowQueryOptimizerAgentSpec: AgentSpec = {
  id: 'slow-query-optimizer',
  label: 'Query Optimizer',
  tools: [
    'schema',
    'detectDbEngine',
    'getTopSlowQueries',
    'explainQueryPlan',
    'compareQueryRewrite',
    'getStatisticsHealth',
    'validateQuery',
    'runQuery',
    'describeQuery',
    'present',
    'agent',
    'taskStatus',
  ],
  systemPrompt: SLOW_QUERY_OPTIMIZER_PROMPT,
  prefersSourceEngine: true,
  defaultLayoutMode: 'focus',
  routingKeywords: [
    /\b(slow|sluggish|expensive|hot)\s+(query|queries|sql)\b/i,
    /\b(optimi[sz]e|rewrite|execution plan|explain analyze)\b/i,
    /\bpg_stat_statements\b/i,
  ],
};

export const AGENT_SPECS: Record<AgentId, AgentSpec> = {
  data: DataAgentSpec,
  code: CodingAgentSpec,
  'db-performance-audit': DbPerformanceAuditAgentSpec,
  'slow-query-optimizer': SlowQueryOptimizerAgentSpec,
};

/**
 * Pick an agent from a user prompt using heuristic keyword matching. Returns
 * the spec with the most keyword hits; ties go to the DataAgent because the
 * privacy-safe pipeline is the safer default. Override via /data or /code
 * slash commands handled in the CLI.
 */
export function routeAgent(prompt: string): AgentSpec {
  let bestSpec = DataAgentSpec;
  let bestScore = -1;
  for (const spec of [
    DataAgentSpec,
    CodingAgentSpec,
    DbPerformanceAuditAgentSpec,
    SlowQueryOptimizerAgentSpec,
  ]) {
    let score = 0;
    for (const re of spec.routingKeywords) if (re.test(prompt)) score++;
    if (score > bestScore) {
      bestSpec = spec;
      bestScore = score;
    }
  }
  return bestSpec;
}
