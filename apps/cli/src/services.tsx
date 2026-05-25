import type { DuckDBComputeWithConnection } from '@qwery/adapter-compute-duckdb';
import type {
  Branching,
  ConfigStore,
  IDatasourceRepository,
  IMessageRepository,
  IModelCatalog,
  IProjectRepository,
  ISecretVault,
  ISessionRepository,
  IUsageRepository,
  LLMProvider,
  Logger,
  Project,
  Telemetry,
} from '@qwery/domain';
import type React from 'react';
import { createContext, useContext } from 'react';
import type { AttachedDatasourcesRegistry } from './infra/datasources';
import type { Updater } from './infra/updater';

export interface AppServices {
  compute: DuckDBComputeWithConnection;
  llm: LLMProvider;
  configStore: ConfigStore;
  logger: Logger;
  telemetry: Telemetry;
  sessionRepo: ISessionRepository;
  messageRepo: IMessageRepository;
  usageRepo: IUsageRepository;
  datasourceRepo: IDatasourceRepository;
  projectRepo: IProjectRepository;
  modelCatalog: IModelCatalog;
  attachedDatasources: AttachedDatasourcesRegistry;
  vault: ISecretVault;
  branching: Branching;
  updater: Updater;
  /** The project for the current working directory (resolved at startup). */
  currentProject: Project;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: React.ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside <ServicesProvider>');
  return ctx;
}
