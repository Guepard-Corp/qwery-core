import { realpathSync } from 'node:fs';
import { createGfsBranching } from '@qwery/adapter-branching-gfs';
import { createDuckDBCompute } from '@qwery/adapter-compute-duckdb';
import { createAiSdkLLM } from '@qwery/adapter-llm-aisdk';
import { createHttpModelCatalog } from '@qwery/adapter-model-catalog-http';
import { createSqlitePersistence } from '@qwery/adapter-persistence-sqlite';
import { Project as ProjectUseCases } from '@qwery/application';
import { createTelemetry } from '@qwery/telemetry';
import { CLI_EVENTS } from '@qwery/telemetry/events';
import { render } from 'ink';
// Side-effect imports — each registers its driver + extension metadata via the SDK.
import '@qwery/extension-csv-local';
import '@qwery/extension-xlsx-local';
import '@qwery/extension-parquet';
import '@qwery/extension-postgresql';
import '@qwery/extension-csv-online';
import '@qwery/extension-json-online';
import '@qwery/extension-gsheet-csv';
import '@qwery/extension-s3';
import '@qwery/extension-duckdb';
import '@qwery/extension-mysql';
import '@qwery/extension-clickhouse-node';
import { App } from './app';
import { createFileConfigStore } from './infra/config';
import { createAttachedDatasourcesRegistry } from './infra/datasources';
import { createFileLogger } from './infra/logger';
import { createSecretVault } from './infra/secret-vault';
import { getAnonymousId } from './infra/telemetry';
import { createUpdater } from './infra/updater';
import { type AppServices, ServicesProvider } from './services';

const configStore = createFileConfigStore();
const logger = createFileLogger();
// Single telemetry entry point: one facade fanning out to every enabled backend
// (PostHog/OTel/Sentry). No-op unless configured via env; honours
// QWERY_TELEMETRY_ENABLED=false. The rest of the app only sees `services.telemetry`.
const telemetry = createTelemetry({ serviceName: 'qwery-cli', distinctId: getAnonymousId() });
// The vault is built here (composition root) and injected into the persistence
// adapter so the adapter depends on no other adapter (ADR #35). The master key
// lives in the OS keyring (file fallback), migrating any legacy on-disk key.
const vault = createSecretVault();
const persistence = createSqlitePersistence({ vault });
const compute = createDuckDBCompute();
const branching = createGfsBranching();
const attachedDatasources = createAttachedDatasourcesRegistry({
  compute,
  datasourceRepo: persistence.datasourceRepo,
  logger,
  telemetry,
});
// Resolve (or lazily create) the project for the current working directory.
// `realpathSync` canonicalizes the path so symlinked cwds map to one project.
const currentProject = await ProjectUseCases.resolveCurrentProject(
  { projectRepo: persistence.projectRepo },
  realpathSync(process.cwd()),
);
const services: AppServices = {
  compute,
  llm: createAiSdkLLM(configStore),
  configStore,
  logger,
  telemetry,
  sessionRepo: persistence.sessionRepo,
  messageRepo: persistence.messageRepo,
  usageRepo: persistence.usageRepo,
  datasourceRepo: persistence.datasourceRepo,
  projectRepo: persistence.projectRepo,
  modelCatalog: createHttpModelCatalog(),
  attachedDatasources,
  vault: persistence.vault,
  branching,
  updater: createUpdater({ logger, currentGfsVersion: () => branching.version() }),
  currentProject,
};

telemetry.trackEvent(CLI_EVENTS.SESSION_STARTED);

const { waitUntilExit } = render(
  <ServicesProvider services={services}>
    <App />
  </ServicesProvider>,
  // Ctrl+C is handled inside the app: abort the current turn if busy,
  // exit only when idle. Ink's built-in exit-on-Ctrl+C would otherwise kill
  // the whole process mid-stream and lose state.
  { exitOnCtrlC: false },
);

waitUntilExit().then(async () => {
  telemetry.trackEvent(CLI_EVENTS.SESSION_ENDED);
  // Flush buffered events and tear down backends before exit (bounded by an
  // internal timeout so a slow backend never freezes shutdown).
  await telemetry.shutdown();
  process.exit(0);
});
