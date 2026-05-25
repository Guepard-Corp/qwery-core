import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const WORKSPACE_AGENTS = path.join(process.cwd(), '.qwery', 'agents');
const USER_AGENTS = path.join(homedir(), '.qwery', 'agents');
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_SUBAGENTS = 30;

export type SubagentScope = 'user' | 'workspace';
export type SubagentBase = 'data' | 'code';

export interface SubagentSummary {
  name: string;
  description: string;
  /** Inherited base agent (data or code) — defines the default tool roster. */
  baseAgent: SubagentBase;
  /** Optional tool whitelist that overrides the base agent's roster. */
  tools?: string[];
  /** Optional model id override (provider-qualified, e.g. `openai/gpt-5`). */
  model?: string;
  /** The markdown body that becomes the subagent's prompt preamble. */
  prompt: string;
  path: string;
  scope: SubagentScope;
}

interface FrontmatterFields {
  name?: string;
  description?: string;
  agent?: string;
  tools?: string | string[];
  model?: string;
}

function parseFrontmatter(raw: string): { fields: FrontmatterFields; body: string } {
  if (!raw.startsWith('---\n')) return { fields: {}, body: raw };
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return { fields: {}, body: raw };
  const block = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const fields: FrontmatterFields = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!.trim();
    let value = m[2]!.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === 'tools' && value.startsWith('[') && value.endsWith(']')) {
      fields.tools = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (key === 'name' || key === 'description' || key === 'agent' || key === 'model') {
      (fields as Record<string, string>)[key] = value;
    }
  }
  return { fields, body };
}

function validateName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return false;
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) return false;
  return true;
}

function validateBase(value: string | undefined): SubagentBase {
  return value === 'code' ? 'code' : 'data';
}

async function loadSubagentsFromDir(dir: string, scope: SubagentScope): Promise<SubagentSummary[]> {
  let entries: Array<{ name: string; isFile(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const subagents: SubagentSummary[] = [];
  for (const entry of entries) {
    if (subagents.length >= MAX_SUBAGENTS) break;
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
    const fullPath = path.join(dir, entry.name);
    try {
      const raw = await fs.readFile(fullPath, 'utf-8');
      const { fields, body } = parseFrontmatter(raw);
      const name = fields.name?.trim() ?? '';
      const description = fields.description?.trim() ?? '';
      const prompt = body.trim();
      if (!validateName(name)) continue;
      if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) continue;
      if (prompt.length === 0) continue;
      subagents.push({
        name,
        description,
        baseAgent: validateBase(fields.agent),
        tools: Array.isArray(fields.tools) ? fields.tools : undefined,
        model: typeof fields.model === 'string' ? fields.model : undefined,
        prompt,
        path: fullPath,
        scope,
      });
    } catch {
      // ignore unreadable files
    }
  }
  return subagents;
}

/**
 * Load subagents from `<workspace>/.qwery/agents/*.md` and `~/.qwery/agents/*.md`.
 * Each file is a markdown document with YAML-ish frontmatter:
 *   ---
 *   name: sql-optimizer
 *   description: Reviews SQL queries and suggests rewrites or indexes.
 *   agent: data
 *   tools: [schema, runQuery, describeQuery]
 *   model: openai/gpt-5  # optional, overrides the active provider
 *   ---
 *   <body — becomes the subagent's prompt preamble>
 *
 * Workspace subagents override user subagents on name conflict.
 */
export async function listLocalSubagents(): Promise<SubagentSummary[]> {
  const [workspaceAgents, userAgents] = await Promise.all([
    loadSubagentsFromDir(WORKSPACE_AGENTS, 'workspace'),
    loadSubagentsFromDir(USER_AGENTS, 'user'),
  ]);
  const merged = new Map<string, SubagentSummary>();
  for (const sa of userAgents) merged.set(sa.name, sa);
  for (const sa of workspaceAgents) merged.set(sa.name, sa);
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}
