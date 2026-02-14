import { useQuery } from '@tanstack/react-query';

import type {
  DatasourceExtension,
  ExtensionDefinition,
} from '@qwery/extensions-sdk';
import { apiGet } from '../repositories/api-client';
import { getLogger } from '@qwery/shared/logger';

export function useGetExtension(extensionId: string) {
  return useQuery({
    queryKey: ['extension', extensionId],
    queryFn: async (): Promise<ExtensionDefinition | undefined> => {
      const extension = await apiGet<ExtensionDefinition | null>(
        `/extensions/${encodeURIComponent(extensionId)}`,
        true,
      );
      return extension ?? undefined;
    },
    enabled: !!extensionId,
    staleTime: 60 * 1000,
  });
}

export function useGetAllExtensions() {
  return useQuery({
    queryKey: ['extensions'],
    queryFn: async (): Promise<ExtensionDefinition[]> => {
      const logger = await getLogger();
      try {
        const extensions = await apiGet<ExtensionDefinition[]>(
          `/extensions`,
          true,
        );
        return Array.isArray(extensions) ? extensions : [];
      } catch (error) {
        logger.error('Failed to get all extensions', { error: error });
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useGetDatasourceExtensions() {
  return useQuery({
    queryKey: ['extensions', 'datasource'],
    queryFn: async (): Promise<DatasourceExtension[]> => {
      const logger = await getLogger();
      try {
        const extensions = await apiGet<DatasourceExtension[]>(
          `/extensions?scope=datasource`,
          true,
        );
        return Array.isArray(extensions) ? extensions : [];
      } catch (error) {
        logger.error('Failed to get datasource extensions', { error: error });
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
}
