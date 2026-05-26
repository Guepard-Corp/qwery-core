import type { IDatasourceRepository, IUsageRepository } from '@qwery/domain';
import { type Tool, tool } from 'ai';
import { z } from 'zod';

// We store heterogeneous tools in a single registry; precise input/output
// generics are not load-bearing here. `RegistryTool` keeps the type open so the
// store accepts every shape that `tool({...})` produces.
type RegistryTool = Tool;

/**
 * Lazy-loadable tool registry. The LLM only sees the three "navigator" tools
 * (`listTools`, `searchTools`, `loadTool`) plus its agent's base tools at the
 * first step of a turn. Calling `loadTool(name)` activates one of the deferred
 * tools for the rest of the conversation, taking advantage of the Vercel AI
 * SDK's `activeTools` + `prepareStep` mechanism (no extra round-trip).
 */

export type RegistryScope = 'data' | 'code' | 'all';

export interface ToolDescriptor {
  name: string;
  description: string;
  scope: RegistryScope;
  tool: RegistryTool;
}

export interface RegistrySkill {
  name: string;
  description: string;
  path: string;
}

export interface RegistryAttachState {
  status: 'attached' | 'detached' | 'error';
  tables?: Array<{ path: string; columns: Array<{ name: string; type: string }> }>;
  error?: string;
}

/**
 * Side-effect-providing dependencies a registry needs to back its CRUDs. Each
 * function is optional — when missing, the corresponding tool reports
 * "unavailable" to the LLM instead of throwing.
 */
export interface ToolRegistryDeps {
  /** Datasource repository (list only — `get` would leak credentials). */
  datasourceRepo?: IDatasourceRepository;
  /** Read current attach state for a datasource. */
  getAttachState?: (datasourceId: string) => RegistryAttachState | undefined;
  /** Attach a datasource by id. Returns the new state. */
  attachDatasource?: (datasourceId: string) => Promise<RegistryAttachState>;
  /** Detach a datasource by id. */
  detachDatasource?: (datasourceId: string) => Promise<void>;
  /**
   * Run a connection test against a datasource without revealing its config
   * to the LLM. Implementation reveals secrets server-side, calls the driver's
   * `testConnection()`, and returns only a binary ok/err.
   */
  testDatasource?: (datasourceId: string) => Promise<{ ok: boolean; error?: string }>;
  /** Read all skills from the workspace + user dirs. */
  listSkills?: () => Promise<RegistrySkill[]>;
  /** Read a skill's full content by name. */
  readSkill?: (name: string) => Promise<{ name: string; content: string; path: string } | null>;
  /** Usage repository (read-only listing). */
  usageRepo?: IUsageRepository;
}

interface RegistryContext {
  /** Names of tools currently active for this turn. Mutated by `loadTool`. */
  loadedTools: Set<string>;
  /** Notifier called when the set changes so the loop knows to re-render. */
  onLoadedToolsChange?: (names: string[]) => void;
}

const SCOPE_SENTENCE: Record<RegistryScope, string> = {
  data: 'For the DataAgent.',
  code: 'For the CodingAgent.',
  all: 'For any agent.',
};

function describeDeferred(t: ToolDescriptor): { name: string; description: string; scope: RegistryScope } {
  return {
    name: t.name,
    description: `${SCOPE_SENTENCE[t.scope]} ${t.description}`,
    scope: t.scope,
  };
}

/**
 * Build the deferred-tool registry. `coreTools` are the base tools always
 * present (e.g. schema/runQuery/edit) — listed but NOT controllable via
 * `loadTool`. `deferred` are the lazy ones the LLM has to load.
 */
export function buildToolRegistry(
  deps: ToolRegistryDeps,
  coreTools: Array<{ name: string; description: string }>,
  context: RegistryContext,
): {
  deferred: ToolDescriptor[];
  navigators: Record<'listTools' | 'searchTools' | 'loadTool', RegistryTool>;
} {
  const deferred: ToolDescriptor[] = [];

  // -------- datasource CRUDs (read-only + lifecycle, no `get`) --------
  if (deps.datasourceRepo) {
    deferred.push({
      name: 'datasourceList',
      scope: 'all',
      description:
        'List all configured datasources with their name, provider, slug, and current attach state. Never returns credentials or config — use `datasourceTest` to verify a connection works.',
      tool: tool({
        description: 'List configured datasources (no credentials).',
        inputSchema: z.object({}),
        execute: async () => {
          const all = await deps.datasourceRepo!.findAll();
          return {
            ok: true as const,
            datasources: all.map((ds) => {
              const state = deps.getAttachState?.(ds.id);
              return {
                id: ds.id,
                slug: ds.slug,
                name: ds.name,
                provider: ds.datasource_provider,
                driver: ds.datasource_driver,
                attached: state?.status === 'attached',
                tableCount: state?.status === 'attached' && state.tables ? state.tables.length : 0,
              };
            }),
          };
        },
      }),
    });
  }

  if (deps.testDatasource) {
    deferred.push({
      name: 'datasourceTest',
      scope: 'all',
      description:
        'Test that a datasource is reachable by id. Returns only `{ ok }` (or an error message) — never reveals the connection config or credentials.',
      tool: tool({
        description: 'Test a datasource connection without revealing its config.',
        inputSchema: z.object({ id: z.string().describe('Datasource id (from datasourceList).') }),
        execute: async ({ id }) => deps.testDatasource!(id),
      }),
    });
  }

  if (deps.attachDatasource) {
    deferred.push({
      name: 'datasourceAttach',
      scope: 'all',
      description:
        'Attach a configured datasource by id so its tables become queryable via schema/runQuery/present. Idempotent.',
      tool: tool({
        description: 'Attach a datasource by id.',
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          const state = await deps.attachDatasource!(id);
          return {
            ok: state.status === 'attached',
            status: state.status,
            tableCount: state.tables?.length ?? 0,
            error: state.error,
          };
        },
      }),
    });
  }

  if (deps.detachDatasource) {
    deferred.push({
      name: 'datasourceDetach',
      scope: 'all',
      description:
        'Detach a previously-attached datasource by id so its tables stop being queryable in the current session.',
      tool: tool({
        description: 'Detach a datasource by id.',
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          await deps.detachDatasource!(id);
          return { ok: true as const };
        },
      }),
    });
  }

  // -------- skill CRUDs --------
  if (deps.listSkills) {
    deferred.push({
      name: 'skillList',
      scope: 'all',
      description:
        'List installed skills (workspace + user) with name + description. Read the full content via `skillRead(name)` only if a description matches the user request.',
      tool: tool({
        description: 'List available skills.',
        inputSchema: z.object({}),
        execute: async () => {
          const skills = await deps.listSkills!();
          return { ok: true as const, skills };
        },
      }),
    });
  }

  if (deps.readSkill) {
    deferred.push({
      name: 'skillRead',
      scope: 'all',
      description: 'Read the full content of a skill by name. Returns the markdown body.',
      tool: tool({
        description: 'Read a skill file by name.',
        inputSchema: z.object({ name: z.string().describe('Skill name from `skillList`.') }),
        execute: async ({ name }) => {
          const result = await deps.readSkill!(name);
          if (!result) return { ok: false as const, error: `Skill "${name}" not found` };
          return { ok: true as const, ...result };
        },
      }),
    });
  }

  // -------- usage list --------
  if (deps.usageRepo) {
    deferred.push({
      name: 'usageList',
      scope: 'all',
      description:
        'List usage entries (tokens + cost) for the current session, optionally filtered. Useful for "how much did this session cost?" or "how many tokens did the last turn use?".',
      tool: tool({
        description: 'List usage entries.',
        inputSchema: z.object({
          sessionId: z.string().optional().describe('Filter by session id. Omit to return all sessions.'),
          limit: z.number().int().min(1).max(200).default(50),
        }),
        execute: async ({ sessionId, limit }) => {
          const entries = sessionId
            ? await deps.usageRepo!.findBySessionId(sessionId)
            : await deps.usageRepo!.findAll();
          const tail = entries.slice(-limit);
          const totals = tail.reduce(
            (acc, u) => ({
              inputTokens: acc.inputTokens + u.inputTokens,
              outputTokens: acc.outputTokens + u.outputTokens,
              costUSD: acc.costUSD + u.costUSD,
            }),
            { inputTokens: 0, outputTokens: 0, costUSD: 0 },
          );
          return {
            ok: true as const,
            count: tail.length,
            totals,
            entries: tail.map((u) => ({
              messageId: u.messageId,
              sessionId: u.sessionId,
              model: u.model,
              inputTokens: u.inputTokens,
              outputTokens: u.outputTokens,
              totalTokens: u.totalTokens,
              costUSD: u.costUSD,
              timestamp: u.timestamp,
            })),
          };
        },
      }),
    });
  }

  // -------- navigator tools (always active) --------
  const allLoadable: ToolDescriptor[] = deferred;

  const navigators = {
    listTools: tool({
      description:
        'List every tool you can use — those already active (base tools you can call right now) and those deferred (loadable via `loadTool`). Use this once at the start of a turn if you are not sure what is available.',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          ok: true as const,
          active: coreTools,
          deferred: allLoadable.map(describeDeferred),
        };
      },
    }),

    searchTools: tool({
      description:
        'Search the deferred (loadable) tools by free text. Returns tools whose name or description matches. Use this when you suspect a capability exists but you do not know its exact name.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Free-text description of what you need.'),
      }),
      execute: async ({ query }) => {
        const q = query.toLowerCase();
        const hits = allLoadable
          .map((t) => {
            const hay = `${t.name} ${t.description}`.toLowerCase();
            const score = hay.includes(q) ? 1 : q.split(/\s+/).filter((w) => hay.includes(w)).length;
            return { t, score };
          })
          .filter((h) => h.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((h) => describeDeferred(h.t));
        return { ok: true as const, hits };
      },
    }),

    loadTool: tool({
      description:
        'Activate a deferred tool by name for the rest of this conversation. After loading, you can call the tool by its name in the same turn. Idempotent: loading an already-loaded tool is a no-op.',
      inputSchema: z.object({
        name: z.string().describe('Tool name from `listTools` / `searchTools`.'),
      }),
      execute: async ({ name }) => {
        const descriptor = allLoadable.find((t) => t.name === name);
        if (!descriptor) return { ok: false as const, error: `Unknown tool "${name}"` };
        if (context.loadedTools.has(name)) {
          return { ok: true as const, alreadyLoaded: true, name };
        }
        context.loadedTools.add(name);
        context.onLoadedToolsChange?.([...context.loadedTools]);
        return { ok: true as const, alreadyLoaded: false, name, description: descriptor.description };
      },
    }),
  };

  return { deferred, navigators };
}

export function makeRegistryContext(initial?: Iterable<string>): RegistryContext {
  return { loadedTools: new Set<string>(initial ?? []) };
}
