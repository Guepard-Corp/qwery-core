import { createContext, useContext } from 'react';

import type { IDatasourceRepository } from '@qwery/domain/repositories';
import { GetDatasourceService } from '@qwery/domain/services';
import {
  DatasourceKind,
  type DatasourceMetadata,
} from '@qwery/domain/entities';
import {
  DatasourceExtension,
  type DriverExtension,
} from '@qwery/extensions-sdk';
import { getBrowserDriverInstance } from '~/lib/services/browser-driver';
import { getDefaultModel } from '@qwery/agent-factory-sdk';
import { apiPost, driverCommand } from '~/lib/repositories/api-client';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';

interface NotebookPromptResponse {
  sqlQuery: string | null;
  hasSql: boolean;
  conversationSlug: string;
}

interface AgentsContextValue {
  runQueryWithAgent: (
    datasourceRepository: IDatasourceRepository,
    query: string,
    datasourceId: string,
  ) => Promise<string | null>;
  runNotebookPromptWithAgent: (
    datasourceRepository: IDatasourceRepository,
    query: string,
    datasourceId: string,
    projectId: string,
    userId: string,
    notebookId?: string,
  ) => Promise<NotebookPromptResponse>;
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
  const { data: extensions = [] } = useGetDatasourceExtensions();

  const runQueryWithAgent = async (
    datasourceRepository: IDatasourceRepository,
    query: string,
    datasourceId: string,
  ): Promise<string | null> => {
    try {
      const datasourceService = new GetDatasourceService(datasourceRepository);
      const datasource = await datasourceService.execute(datasourceId);
      if (!datasource) {
        throw new Error('Datasource not found');
      }

      if (!datasource.datasource_provider) {
        throw new Error('Datasource provider is required');
      }

      // Get driver metadata to check runtime
      // Find the extension from the list
      const dsMeta = extensions.find(
        (ext) => ext.id === datasource.datasource_provider,
      ) as DatasourceExtension | undefined;

      if (!dsMeta) {
        throw new Error('Datasource metadata not found');
      }

      const driver =
        dsMeta.drivers.find(
          (d) =>
            d.id === (datasource.config as { driverId?: string })?.driverId,
        ) ?? dsMeta.drivers[0];

      if (!driver) {
        throw new Error('Driver not found');
      }

      const runtime = driver.runtime ?? 'browser';

      let metadata: DatasourceMetadata;

      // Handle browser drivers (embedded datasources) - client-side
      if (runtime === 'browser') {
        if (datasource.datasource_kind !== DatasourceKind.EMBEDDED) {
          throw new Error('Browser drivers require embedded datasources');
        }

        const driverInstance = await getBrowserDriverInstance(
          driver as DriverExtension,
          { config: datasource.config },
        );

        metadata = await driverInstance.metadata();
      } else {
        // Handle node drivers (remote datasources) via API
        metadata = await driverCommand<DatasourceMetadata>('metadata', {
          datasourceProvider: datasource.datasource_provider,
          driverId: driver.id,
          config: datasource.config,
        });
      }

      if (!metadata) {
        throw new Error('Metadata not available');
      }

      const schema = metadata.tables
        .map(
          (table) =>
            `${table.schema}.${table.name} (${metadata.columns
              .filter((col) => col.table_id === table.id)
              .map((col) => `${col.name} ${col.data_type}`)
              .join(', ')})`,
        )
        .join('\n');

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

  const runNotebookPromptWithAgent = async (
    datasourceRepository: IDatasourceRepository,
    query: string,
    datasourceId: string,
    projectId: string,
    userId: string,
    notebookId: string = 'default',
  ): Promise<NotebookPromptResponse> => {
    try {
      if (!projectId || !userId) {
        throw new Error('Project ID and User ID are required');
      }

      // Call the notebook prompt API endpoint
      const response = await apiPost<NotebookPromptResponse>(
        '/notebook/prompt',
        {
          query,
          notebookId,
          datasourceId,
          projectId,
          userId,
          model: options.model || getDefaultModel(),
        },
      );

      return response;
    } catch (error) {
      console.error('Error running notebook prompt with agent:', error);
      throw error;
    }
  };

  const value: AgentsContextValue = {
    runQueryWithAgent,
    runNotebookPromptWithAgent,
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
