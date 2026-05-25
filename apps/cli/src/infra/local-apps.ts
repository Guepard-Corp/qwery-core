import { promises as fs } from 'node:fs';
import path from 'node:path';

const APPS_ROOT = path.join(process.cwd(), 'apps');
const MAX_APPS = 30;
const MAX_FILES_PER_APP = 12;

export interface LocalAppSummary {
  slug: string;
  files: string[];
  truncated: boolean;
}

async function listImmediateFiles(dir: string): Promise<{ files: string[]; truncated: boolean }> {
  const files: string[] = [];
  let truncated = false;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (files.length >= MAX_FILES_PER_APP) {
      truncated = true;
      break;
    }
    if (entry.isDirectory()) {
      files.push(`${entry.name}/`);
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  files.sort();
  return { files, truncated };
}

/**
 * List user-materialized data apps under `apps/<slug>/` at the workspace root.
 * Used by the system prompt so the LLM knows what apps already exist without
 * having to discover them via bash on every turn.
 */
export async function listLocalApps(): Promise<LocalAppSummary[]> {
  try {
    const entries = await fs.readdir(APPS_ROOT, { withFileTypes: true });
    const apps: LocalAppSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      if (apps.length >= MAX_APPS) break;
      const appDir = path.join(APPS_ROOT, entry.name);
      const { files, truncated } = await listImmediateFiles(appDir);
      apps.push({ slug: entry.name, files, truncated });
    }
    apps.sort((a, b) => a.slug.localeCompare(b.slug));
    return apps;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}
