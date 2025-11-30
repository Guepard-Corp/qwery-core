import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import { FileStateStore } from '../infrastructure/persistence/file-state-store';
import { createInitialState, CLI_STATE_VERSION } from '../state/cli-state';
import { WorkspaceModeEnum, WorkspaceRuntimeEnum } from '@qwery/domain/enums';
import { Roles } from '@qwery/domain/common/roles';

describe('FileStateStore', () => {
  const testDir = join(os.tmpdir(), 'qwery-cli-test');
  let store: FileStateStore;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    store = new FileStateStore(join(testDir, 'test-state.json'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('returns initial state when file does not exist', async () => {
      const state = await store.load();
      expect(state).toEqual(createInitialState());
    });

    it('loads existing state from file', async () => {
      const initialState = createInitialState();
      await store.save(initialState);

      const loaded = await store.load();
      expect(loaded.version).toBe(CLI_STATE_VERSION);
      expect(loaded.workspace).toBeNull();
      expect(loaded.users).toEqual([]);
    });

    it('revives date objects correctly', async () => {
      const state = createInitialState();
      state.workspace = {
        id: 'test-id',
        userId: 'user-1',
        username: 'test',
        organizationId: 'org-1',
        projectId: 'proj-1',
        isAnonymous: false,
        mode: WorkspaceModeEnum.SIMPLE,
        runtime: WorkspaceRuntimeEnum.DESKTOP,
      };
      await store.save(state);

      const loaded = await store.load();
      expect(loaded.workspace?.id).toBe('test-id');
    });
  });

  describe('save', () => {
    it('creates directory if it does not exist', async () => {
      const newStore = new FileStateStore(
        join(testDir, 'nested', 'state.json'),
      );
      const state = createInitialState();
      await newStore.save(state);

      const loaded = await newStore.load();
      expect(loaded).toBeDefined();
    });

    it('persists state to file', async () => {
      const state = createInitialState();
      state.users = [
        {
          id: 'user-1',
          username: 'test',
          role: Roles.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await store.save(state);

      const raw = await readFile(store.path, 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.users).toHaveLength(1);
      expect(parsed.users[0].id).toBe('user-1');
    });

    it('updates version on save', async () => {
      const state = createInitialState();
      await store.save(state);

      const loaded = await store.load();
      expect(loaded.version).toBe(CLI_STATE_VERSION);
    });
  });

  describe('path', () => {
    it('returns the configured file path', () => {
      const customPath = join(testDir, 'custom.json');
      const customStore = new FileStateStore(customPath);
      expect(customStore.path).toBe(customPath);
    });
  });
});
