import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CliContainer } from '../container/cli-container';
import type { Workspace } from '@qwery/domain/entities';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';

describe('CliContainer', () => {
  const testStateDir = join(os.tmpdir(), 'qwery-cli-test-container');
  let container: CliContainer;

  beforeEach(async () => {
    const testStatePath = join(testStateDir, 'test-state.json');
    container = new CliContainer(
      new (
        await import('../infrastructure/persistence/file-state-store')
      ).FileStateStore(testStatePath),
    );
    await container.init();
  });

  afterEach(async () => {
    await rm(testStateDir, { recursive: true, force: true });
  });

  describe('init and persist', () => {
    it('initializes with empty state', () => {
      const workspace = container.getWorkspace();
      expect(workspace).toBeNull();
    });

    it('persists workspace state', async () => {
      const workspace: Workspace = {
        id: 'ws-1',
        userId: 'user-1',
        username: 'test',
        organizationId: 'org-1',
        projectId: 'proj-1',
        isAnonymous: false,
        mode: WorkspaceModeEnum.SIMPLE,
        runtime: WorkspaceRuntimeEnum.DESKTOP,
      };
      container.setWorkspace(workspace);
      await container.persist();

      const newContainer = new CliContainer(container['stateStore']);
      await newContainer.init();
      const loaded = newContainer.getWorkspace();
      expect(loaded?.id).toBe('ws-1');
    });
  });

  describe('getUseCases', () => {
    it('returns use cases', () => {
      const useCases = container.getUseCases();
      expect(useCases).toBeDefined();
      expect(useCases.initWorkspace).toBeDefined();
      expect(useCases.getProjects).toBeDefined();
    });
  });

  describe('getRepositories', () => {
    it('returns repositories', () => {
      const repos = container.getRepositories();
      expect(repos).toBeDefined();
      expect(repos.user).toBeDefined();
      expect(repos.organization).toBeDefined();
      expect(repos.project).toBeDefined();
      expect(repos.datasource).toBeDefined();
      expect(repos.notebook).toBeDefined();
    });
  });

  describe('getNotebookRunner', () => {
    it('returns notebook runner', () => {
      const runner = container.getNotebookRunner();
      expect(runner).toBeDefined();
    });
  });

  describe('setWorkspace', () => {
    it('sets workspace', () => {
      const workspace: Workspace = {
        id: 'ws-1',
        userId: 'user-1',
        username: 'test',
        organizationId: 'org-1',
        projectId: 'proj-1',
        isAnonymous: false,
        mode: WorkspaceModeEnum.SIMPLE,
        runtime: WorkspaceRuntimeEnum.DESKTOP,
      };
      container.setWorkspace(workspace);
      expect(container.getWorkspace()?.id).toBe('ws-1');
    });
  });

  describe('getStateFilePath', () => {
    it('returns state file path', () => {
      const path = container.getStateFilePath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });
  });
});
