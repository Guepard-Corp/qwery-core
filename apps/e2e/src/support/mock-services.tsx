import { createGfsBranching } from '@qwery/adapter-branching-gfs';
import { createDuckDBCompute } from '@qwery/adapter-compute-duckdb';
import { createSqlitePersistence } from '@qwery/adapter-persistence-sqlite';
import type { AppServices } from '@qwery/cli/services';
import type {
  ConfigStore,
  Datasource,
  IDatasourceRepository,
  IMessageRepository,
  IModelCatalog,
  IProjectRepository,
  ISecretVault,
  ISessionRepository,
  IUsageRepository,
  LLMProvider,
  Logger,
  Message,
  Project,
  Session,
  Usage,
} from '@qwery/domain';
import { createProject, NullTelemetry } from '@qwery/domain';
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

/**
 * Builds a fully in-memory `AppServices` for TUI e2e: no sqlite, no network, no
 * gfs spawn, no LLM calls. The App's startup effects (session init, history
 * load, gfs version, catalog) all resolve against these stubs so `render(<App>)`
 * mounts cleanly and deterministically.
 */

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

class InMemorySessionRepo implements ISessionRepository {
  private store = new Map<string, Session>();
  async findAll() {
    return [...this.store.values()];
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findBySlug() {
    return null;
  }
  async create(entity: Session) {
    this.store.set(entity.id, entity);
    return entity;
  }
  async update(entity: Session) {
    this.store.set(entity.id, entity);
    return entity;
  }
  async delete(id: string) {
    return this.store.delete(id);
  }
  shortenId(id: string) {
    return id.slice(0, 8);
  }
  async findByDatasourceId() {
    return [];
  }
  async findByProjectId() {
    return [];
  }
}

class InMemoryProjectRepo implements IProjectRepository {
  private store = new Map<string, Project>();
  async findAll() {
    return [...this.store.values()];
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    for (const p of this.store.values()) if (p.slug === slug) return p;
    return null;
  }
  async create(entity: Project) {
    this.store.set(entity.id, entity);
    return entity;
  }
  async update(entity: Project) {
    this.store.set(entity.id, entity);
    return entity;
  }
  async delete(id: string) {
    return this.store.delete(id);
  }
  shortenId(id: string) {
    return id.slice(0, 8);
  }
  async attachDatasource() {}
  async detachDatasource() {}
  async listDatasourceIds() {
    return [];
  }
  async findByDatasourceId() {
    return [];
  }
}

function emptyRepo<T extends { id: string }>() {
  const store = new Map<string, T>();
  return {
    async findAll() {
      return [...store.values()];
    },
    async findById(id: string) {
      return store.get(id) ?? null;
    },
    async findBySlug() {
      return null;
    },
    async create(entity: T) {
      store.set(entity.id, entity);
      return entity;
    },
    async update(entity: T) {
      store.set(entity.id, entity);
      return entity;
    },
    async delete(id: string) {
      return store.delete(id);
    },
    shortenId(id: string) {
      return id.slice(0, 8);
    },
  };
}

const compute: AppServices['compute'] = {
  runSql: async () => ({ columns: [], rows: [], rowCount: 0, durationMs: 0 }),
  describeSql: async () => ({ columns: [] }),
  // Never reached in TUI render e2e; throw rather than spin up a real DuckDB connection.
  getRawConnection: async () => {
    throw new Error('getRawConnection is not available in the e2e mock');
  },
};

const llm: LLMProvider = {
  getModel: () => ({}) as ReturnType<LLMProvider['getModel']>,
};

const configStore: ConfigStore = {
  read: () => ({ providers: {} }),
  write: () => ({ providers: {} }),
  setProviderConfig: () => ({ providers: {} }),
  getActiveProvider: () => null,
};

const modelCatalog: IModelCatalog = {
  getCatalog: async () => ({}) as Awaited<ReturnType<IModelCatalog['getCatalog']>>,
};

const vault: ISecretVault = {
  set: async () => undefined,
  get: async () => null,
  delete: async () => undefined,
} as unknown as ISecretVault;

const attachedDatasources: AppServices['attachedDatasources'] = {
  list: () => [],
  get: () => undefined,
  attach: async (ds: Datasource) => ({ status: 'detached', datasource: ds }),
  detach: async () => undefined,
  test: async () => ({ ok: true }),
  schemas: async () => [],
  // No real datasources change, so the listener is never invoked; return a no-op unsubscribe.
  subscribe: () => () => undefined,
};

/**
 * An LLM that streams a fixed assistant reply (no tool calls). Lets a full chat
 * turn run deterministically through `runAgent` without a real model.
 */
export function makeMockModel(text = 'mock reply'): LLMProvider {
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't' },
          { type: 'text-delta', id: 't', delta: text },
          { type: 'text-end', id: 't' },
          {
            type: 'finish',
            finishReason: 'stop',
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          },
        ],
      }) as unknown as ReadableStream<never>,
    }),
  });
  return { getModel: () => model as unknown as ReturnType<LLMProvider['getModel']> };
}

/**
 * Options for {@link makeMockServices}. Any `AppServices` field may be overridden
 * directly (e.g. `{ updater }`, `{ llm }`), plus the extra `persistence` switch:
 * - `memory` (default): everything stubbed in-memory — fast, for UI-only render tests.
 * - `sqlite-memory`: real `bun:sqlite` `:memory:` persistence + real DuckDB compute, so
 *   the DB layer (migrations, repos) is actually exercised. config/vault stay mocked
 *   for isolation (never touch the real `~/.qwery`).
 */
/**
 * An LLM that first calls one tool, then (given the tool result) streams a final
 * reply — exercising the full agentic loop. `doStream` is invoked once per step,
 * so a call counter switches from the tool-call step to the text step.
 */
export function makeToolCallModel(toolName: string, input: unknown, finalText: string): LLMProvider {
  let step = 0;
  const model = new MockLanguageModelV3({
    doStream: async () => {
      step += 1;
      const chunks: Array<Record<string, unknown>> =
        step === 1
          ? [
              { type: 'stream-start', warnings: [] },
              { type: 'tool-call', toolCallId: 'call-1', toolName, input: JSON.stringify(input) },
              {
                type: 'finish',
                finishReason: 'tool-calls',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              },
            ]
          : [
              { type: 'stream-start', warnings: [] },
              { type: 'text-start', id: 't' },
              { type: 'text-delta', id: 't', delta: finalText },
              { type: 'text-end', id: 't' },
              {
                type: 'finish',
                finishReason: 'stop',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              },
            ];
      return { stream: simulateReadableStream({ chunks }) as unknown as ReadableStream<never> };
    },
  });
  return { getModel: () => model as unknown as ReturnType<LLMProvider['getModel']> };
}

export type MockServicesOptions = Partial<AppServices> & {
  persistence?: 'memory' | 'sqlite-memory';
};

export function makeMockServices(opts: MockServicesOptions = {}): AppServices {
  const { persistence, ...overrides } = opts;
  const base: AppServices = {
    compute,
    llm,
    configStore,
    logger: silentLogger,
    telemetry: NullTelemetry,
    sessionRepo: new InMemorySessionRepo(),
    messageRepo: emptyRepo<Message>() as unknown as IMessageRepository,
    usageRepo: emptyRepo<Usage>() as unknown as IUsageRepository,
    datasourceRepo: emptyRepo<Datasource>() as unknown as IDatasourceRepository,
    projectRepo: new InMemoryProjectRepo(),
    modelCatalog,
    attachedDatasources,
    vault,
    // A gfs runner that always fails → version() resolves undefined, no process spawn.
    branching: createGfsBranching({ run: async () => ({ stdout: '', stderr: '', exitCode: 1 }) }),
    // No-op updater by default: no network, nothing staged. Override per test.
    updater: { checkAndStage: async () => [] },
    currentProject: createProject({ path: '/test/project' }),
  };

  if (persistence === 'sqlite-memory') {
    const sqlite = createSqlitePersistence({ dbPath: ':memory:', vault });
    base.sessionRepo = sqlite.sessionRepo;
    base.messageRepo = sqlite.messageRepo;
    base.usageRepo = sqlite.usageRepo;
    base.datasourceRepo = sqlite.datasourceRepo;
    base.projectRepo = sqlite.projectRepo;
    base.vault = sqlite.vault;
    base.compute = createDuckDBCompute();
  }

  return { ...base, ...overrides };
}
