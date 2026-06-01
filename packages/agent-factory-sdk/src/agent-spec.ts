import type { ToolName } from '@qwery/domain';

export type AgentId = 'data' | 'code' | 'db-performance-audit' | 'slow-query-optimizer';

export interface AgentSpec {
  id: AgentId;
  label: string;
  /** Tool names this agent is allowed to call. */
  tools: ToolName[];
  /** Prepended to the base system prompt before the dynamic context blocks. */
  promptPreamble: string;
  /** Heuristic keywords that suggest this agent should handle a prompt. */
  routingKeywords: RegExp[];
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
  promptPreamble:
    'You are the Qwery Database Performance Audit Agent. Run PostgreSQL performance audits for attached datasources and produce evidence-backed findings. Keep row-level data private. Use audit tools for pg_stat, catalog, lock, bloat, replication, and runtime signals. validateRemediationInGfsCli is mandatory before recommending remediation SQL, configuration experiments, maintenance actions, quick wins, or next steps. Only present recommendations whose validateRemediationInGfsCli result has validation.assessment.recommendationStatus = validated. If GFS validation is unavailable or blocked, mark the audit incomplete and write exactly: Blocked - no validated GFS remediation for this finding.',
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
  promptPreamble:
    'You are the Qwery Slow Query Optimizer. Identify slow PostgreSQL read queries, inspect execution plans, propose SQL rewrites or index/statistics remediations, and compare original versus rewritten plans. Keep row-level data private. Configuration tuning is outside the default workflow unless the user explicitly asks.',
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
