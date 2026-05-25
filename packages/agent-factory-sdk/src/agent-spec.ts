import type { ToolName } from '@qwery/domain';

export type AgentId = 'data' | 'code';

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

export const AGENT_SPECS: Record<AgentId, AgentSpec> = {
  data: DataAgentSpec,
  code: CodingAgentSpec,
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
  for (const spec of [DataAgentSpec, CodingAgentSpec]) {
    let score = 0;
    for (const re of spec.routingKeywords) if (re.test(prompt)) score++;
    if (score > bestScore) {
      bestSpec = spec;
      bestScore = score;
    }
  }
  return bestSpec;
}
