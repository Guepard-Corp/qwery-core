'use client';

import { createContext, useContext, useMemo } from 'react';

import type { DatasourceRepositoryPort } from '@qwery/domain/repositories';
import { GetDatasourceService } from '@qwery/domain/services';
import { getExtension } from '@qwery/extensions-sdk';

interface AgentsContextValue {
  runQueryWithAgent: (
    datasourceRepository: DatasourceRepositoryPort,
    query: string,
    datasourceId: string,
  ) => Promise<string | null>;
  isRunning: boolean;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

interface AgentsProviderOptions {
  name?: string;
  model?: string;
  tools?: unknown[];
  temperature?: number;
}

interface AgentsProviderProps extends React.PropsWithChildren {
  options?: AgentsProviderOptions;
}

export function AgentsProvider({
  children,
  options = {},
}: AgentsProviderProps) {
  const _agent = useMemo(() => {
    // TODO: Initialize agent with options
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const runQueryWithAgent = async (
    datasourceRepository: DatasourceRepositoryPort,
    query: string,
    datasourceId: string,
  ): Promise<string | null> => {
    try {
      const datasourceService = new GetDatasourceService(datasourceRepository);
      const datasource = await datasourceService.execute(datasourceId);
      if (!datasource) {
        throw new Error('Datasource not found');
      }

      const extension = await getExtension(datasource.datasource_provider);
      if (!extension) {
        throw new Error('Extension not found');
      }

      const driverStorageKey =
        (datasource.config as { storageKey?: string })?.storageKey ??
        datasource.id ??
        datasource.slug ??
        datasource.name;
      const driver = await extension.getDriver(
        driverStorageKey,
        datasource.config,
      );
      if (!driver) {
        throw new Error('Driver not found');
      }

      const schema = await driver.getCurrentSchema();

      const _prompt = `You are a SQL query assistant. 
      The user wants to run a query: "${query}" on datasource: "${datasource.datasource_provider}". 
      The schema of the datasource is: "${schema}".
      Generate an appropriate SQL query based on this request.
      
      Respect the following rules:
      - The query should be a valid SQL query.
      - Only send the SQL query, no other text.
      `;

      const result = 'SELECT * FROM users';

      return result || null;
    } catch (error) {
      console.error('Error running query with agent:', error);
      throw error;
    }
  };

  const value: AgentsContextValue = {
    runQueryWithAgent,
    isRunning: false, // TODO: Track running state
  };

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  );
}

export function useAgents(): AgentsContextValue {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
}
