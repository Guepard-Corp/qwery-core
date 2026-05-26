import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { BUILTIN_SKILL_SOURCES } from './builtin-skills';

const WORKSPACE_SKILLS = path.join(process.cwd(), '.qwery', 'skills');
const USER_SKILLS = path.join(homedir(), '.qwery', 'skills');
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_SKILLS = 50;

export type SkillScope = 'builtin' | 'user' | 'workspace';
export type SkillAgent = 'data' | 'code' | 'all';

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  scope: SkillScope;
  /** Which agent this skill applies to. Defaults to `all`. */
  agent: SkillAgent;
}

interface FrontmatterFields {
  name?: string;
  description?: string;
  agent?: string;
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
    if (key === 'name' || key === 'description' || key === 'agent') {
      fields[key] = value;
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

function validateAgent(value: string | undefined): SkillAgent {
  return value === 'data' || value === 'code' ? value : 'all';
}

/** Parse and validate a skill's frontmatter fields. Returns null if invalid. */
function parseSkillFields(raw: string): Pick<SkillSummary, 'name' | 'description' | 'agent'> | null {
  const { fields } = parseFrontmatter(raw);
  const name = fields.name?.trim() ?? '';
  const description = fields.description?.trim() ?? '';
  if (!validateName(name)) return null;
  if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) return null;
  return { name, description, agent: validateAgent(fields.agent) };
}

interface BuiltinSkill {
  summary: SkillSummary;
  content: string;
}

let builtinCache: BuiltinSkill[] | null = null;

/**
 * Skills qwery ships by default, embedded in the binary (see
 * `builtin-skills/`). They are the lowest-priority scope: a user or workspace
 * skill with the same name overrides the built-in one.
 */
function loadBuiltinSkills(): BuiltinSkill[] {
  if (builtinCache) return builtinCache;
  const out: BuiltinSkill[] = [];
  for (const raw of BUILTIN_SKILL_SOURCES) {
    if (out.length >= MAX_SKILLS) break;
    const parsed = parseSkillFields(raw);
    if (!parsed) continue;
    out.push({
      summary: { ...parsed, path: `<builtin>/${parsed.name}.md`, scope: 'builtin' },
      content: raw,
    });
  }
  builtinCache = out;
  return out;
}

/** Summaries of the skills qwery ships by default (lowest-priority scope). */
export function listBuiltinSkills(): SkillSummary[] {
  return loadBuiltinSkills().map((b) => b.summary);
}

async function loadSkillsFromDir(dir: string, scope: SkillScope): Promise<SkillSummary[]> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const skills: SkillSummary[] = [];
  for (const entry of entries) {
    if (skills.length >= MAX_SKILLS) break;
    const fullPath = path.join(dir, entry.name);
    let skillFile: string | null = null;
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      skillFile = fullPath;
    } else if (entry.isDirectory()) {
      const skillMd = path.join(fullPath, 'SKILL.md');
      try {
        const stat = await fs.stat(skillMd);
        if (stat.isFile()) skillFile = skillMd;
      } catch {
        continue;
      }
    }
    if (!skillFile) continue;
    try {
      const raw = await fs.readFile(skillFile, 'utf-8');
      const parsed = parseSkillFields(raw);
      if (!parsed) continue;
      skills.push({ ...parsed, path: skillFile, scope });
    } catch {
      // ignore unreadable files
    }
  }
  return skills;
}

/**
 * Load skills from `<workspace>/.qwery/skills/` and `~/.qwery/skills/`. Each
 * skill is a markdown file (or `<dir>/SKILL.md`) with YAML-ish frontmatter:
 *   ---
 *   name: kebab-case-name
 *   description: One-line summary the LLM uses to decide relevance.
 *   agent: data | code | all
 *   ---
 *   <body — the full instructions, read on demand via the `read` tool>
 *
 * Priority on name conflict: workspace > user > built-in. Built-in skills ship
 * with qwery; a user or workspace skill of the same name overrides them.
 * Inspired by pi's `SKILL.md` spec; spec is intentionally strict (kebab-case,
 * length caps).
 */
export async function listLocalSkills(): Promise<SkillSummary[]> {
  const [workspaceSkills, userSkills] = await Promise.all([
    loadSkillsFromDir(WORKSPACE_SKILLS, 'workspace'),
    loadSkillsFromDir(USER_SKILLS, 'user'),
  ]);
  const merged = new Map<string, SkillSummary>();
  for (const { summary } of loadBuiltinSkills()) merged.set(summary.name, summary);
  for (const skill of userSkills) merged.set(skill.name, skill); // user overrides built-in
  for (const skill of workspaceSkills) merged.set(skill.name, skill); // workspace overrides user
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Read a skill's full markdown body (including frontmatter). */
export async function readLocalSkill(
  name: string,
): Promise<{ name: string; content: string; path: string } | null> {
  const skills = await listLocalSkills();
  const skill = skills.find((s) => s.name === name);
  if (!skill) return null;
  if (skill.scope === 'builtin') {
    const builtin = loadBuiltinSkills().find((b) => b.summary.name === name);
    if (!builtin) return null;
    return { name: skill.name, content: builtin.content, path: skill.path };
  }
  const content = await fs.readFile(skill.path, 'utf-8');
  return { name: skill.name, content, path: skill.path };
}
