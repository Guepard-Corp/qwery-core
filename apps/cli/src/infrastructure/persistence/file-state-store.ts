import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { CliState } from '../../state/cli-state';
import {
  CLI_STATE_VERSION,
  createInitialState,
  ensureWorkspaceMode,
} from '../../state/cli-state';

const DATE_KEYS = new Set(['createdAt', 'updatedAt']);
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.qwery', 'cli-state.json');

function reviveDates(key: string, value: unknown) {
  if (
    typeof value === 'string' &&
    DATE_KEYS.has(key) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value);
  }
  return value;
}

function normalizeState(partial: Partial<CliState> | undefined): CliState {
  const base = createInitialState();

  return {
    version:
      typeof partial?.version === 'number' ? partial.version : base.version,
    workspace: ensureWorkspaceMode(partial?.workspace ?? null),
    users: partial?.users ?? base.users,
    organizations: partial?.organizations ?? base.organizations,
    projects: partial?.projects ?? base.projects,
    datasources: partial?.datasources ?? base.datasources,
    notebooks: partial?.notebooks ?? base.notebooks,
  };
}

export class FileStateStore {
  constructor(private readonly filePath: string = DEFAULT_STATE_FILE) {}

  public get path(): string {
    return this.filePath;
  }

  public async load(): Promise<CliState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw, reviveDates) as Partial<CliState>;
      const normalized = normalizeState(parsed);

      if (normalized.version !== CLI_STATE_VERSION) {
        return {
          ...normalized,
          version: CLI_STATE_VERSION,
        };
      }

      return normalized;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return createInitialState();
      }
      throw error;
    }
  }

  public async save(state: CliState): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    const serialized = JSON.stringify(
      {
        ...state,
        workspace: ensureWorkspaceMode(state.workspace),
        version: CLI_STATE_VERSION,
      },
      null,
      2,
    );
    await writeFile(this.filePath, `${serialized}\n`, 'utf8');
  }
}
