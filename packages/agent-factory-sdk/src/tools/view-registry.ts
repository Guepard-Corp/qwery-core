import { nanoid } from 'nanoid';
import { join } from 'node:path';

export interface ViewRecord {
  viewName: string;
  sourceId: string;
  sharedLink: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}

export interface RegistryContext {
  conversationDir: string;
}

const REGISTRY_FILE = 'views.json';
const SHEET_REGEX =
  /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

const sanitizeViewName = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `v_${cleaned}`;
};

const ensureConversationDir = async (
  context: RegistryContext,
): Promise<string> => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(context.conversationDir, { recursive: true });
  return context.conversationDir;
};

const registryPath = (context: RegistryContext) =>
  join(context.conversationDir, REGISTRY_FILE);

export const loadViewRegistry = async (
  context: RegistryContext,
): Promise<ViewRecord[]> => {
  await ensureConversationDir(context);
  const { readFile } = await import('node:fs/promises');
  try {
    const file = await readFile(registryPath(context), 'utf-8');
    return JSON.parse(file) as ViewRecord[];
  } catch {
    return [];
  }
};

const saveViewRegistry = async (
  context: RegistryContext,
  records: ViewRecord[],
) => {
  await ensureConversationDir(context);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(registryPath(context), JSON.stringify(records, null, 2), {
    encoding: 'utf-8',
  });
};

export const registerSheetView = async (
  context: RegistryContext,
  sharedLink: string,
): Promise<{ record: ViewRecord; isNew: boolean }> => {
  await ensureConversationDir(context);
  const existing = await loadViewRegistry(context);
  const sourceId = sharedLink.match(SHEET_REGEX)?.[1] ?? `sheet_${nanoid(8)}`;

  const match = existing.find((rec) => rec.sourceId === sourceId);
  if (match) {
    match.updatedAt = new Date().toISOString();
    await saveViewRegistry(context, existing);
    return { record: match, isNew: false };
  }

  const baseName = sanitizeViewName(`sheet_${sourceId.slice(0, 8)}`);
  let viewName = baseName;
  let counter = 1;
  while (existing.some((rec) => rec.viewName === viewName)) {
    viewName = `${baseName}_${counter}`;
    counter += 1;
  }

  const now = new Date().toISOString();
  const newRecord: ViewRecord = {
    viewName,
    sourceId,
    sharedLink,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };
  existing.push(newRecord);
  await saveViewRegistry(context, existing);
  return { record: newRecord, isNew: true };
};

export const updateViewUsage = async (
  context: RegistryContext,
  viewName?: string,
) => {
  if (!viewName) {
    return;
  }
  const registry = await loadViewRegistry(context);
  const target = registry.find((record) => record.viewName === viewName);
  if (!target) return;
  target.lastUsedAt = new Date().toISOString();
  target.updatedAt = target.lastUsedAt;
  await saveViewRegistry(context, registry);
};
