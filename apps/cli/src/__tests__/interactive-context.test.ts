import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractiveContext } from '../services/interactive-context';
import { CliContainer } from '../container/cli-container';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

describe('InteractiveContext', () => {
  let container: CliContainer;
  let context: InteractiveContext;
  let testDatasource: Datasource;

  beforeEach(async () => {
    container = new CliContainer();
    await container.init();
    context = new InteractiveContext(container);

    testDatasource = {
      id: 'ds-1',
      projectId: 'proj-1',
      name: 'test-db',
      description: 'Test database',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgresql',
      datasource_kind: DatasourceKind.REMOTE,
      slug: 'test-db',
      config: { connectionUrl: 'postgresql://localhost/test' },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    await container.getRepositories().datasource.create(testDatasource);
  });

  describe('setDatasource', () => {
    it('sets datasource when it exists', async () => {
      await context.setDatasource('ds-1');
      const datasource = await context.getCurrentDatasource();
      expect(datasource?.id).toBe('ds-1');
      expect(datasource?.name).toBe('test-db');
    });

    it('does not set datasource when it does not exist', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await context.setDatasource('non-existent');

      const datasource = await context.getCurrentDatasource();
      expect(datasource).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
      consoleSpy.mockRestore();
    });

    it('updates datasource name for prompt', async () => {
      await context.setDatasource('ds-1');
      expect(context.getDatasourceName()).toBe('test-db');
    });
  });

  describe('getCurrentDatasource', () => {
    it('returns null when no datasource is set', async () => {
      const datasource = await context.getCurrentDatasource();
      expect(datasource).toBeNull();
    });

    it('returns the current datasource when set', async () => {
      await context.setDatasource('ds-1');
      const datasource = await context.getCurrentDatasource();
      expect(datasource?.id).toBe('ds-1');
    });
  });

  describe('getDatasourceName', () => {
    it('returns null when no datasource is set', () => {
      expect(context.getDatasourceName()).toBeNull();
    });

    it('returns datasource name when set', async () => {
      await context.setDatasource('ds-1');
      expect(context.getDatasourceName()).toBe('test-db');
    });
  });
});
