import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod/v3';
import type { AgentInfoWithId } from '../agents/agent';
import { Agent } from '../agents/agent';
import { AgentInfoSchema } from '../agents/agent';

const AgentFrontmatterSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  mode: z.enum(['main', 'delegate', 'all']).optional(),
  model: z
    .union([
      z.string(),
      z.object({ modelID: z.string(), providerID: z.string() }),
    ])
    .optional(),
  toolIds: z.array(z.string()).optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  hidden: z.boolean().optional(),
  steps: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  color: z.string().optional(),
  id: z.string().optional(),
});

type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

function parseModel(
  value: AgentFrontmatter['model'],
): { modelID: string; providerID: string } | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object') return value;
  const parts = String(value).split('/');
  if (parts.length >= 2)
    return { providerID: parts[0]!, modelID: parts.slice(1).join('/') };
  return undefined;
}

function toolsToToolIds(
  tools: Record<string, boolean> | undefined,
): string[] | undefined {
  if (!tools) return undefined;
  const allowlist = Object.entries(tools)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
  const denyAll = tools['*'] === false;
  if (denyAll && allowlist.length > 0) return allowlist;
  if (denyAll) return [];
  return undefined;
}

async function findMarkdownFiles(
  dir: string,
  baseDir: string = dir,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await findMarkdownFiles(full, baseDir)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(full);
    }
  }
  return result;
}

function idFromFilePath(filePath: string): string {
  const base = path.basename(filePath, '.md');
  return base.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Load agents from markdown files in a directory (e.g. `.qwery/agents/`).
 * Each file: YAML frontmatter (name, description, mode, model, toolIds or tools) + body = systemPrompt.
 * Returns AgentInfoWithId[]; use Registry.agents.register() for each to merge with native agents.
 * Returns [] if the directory does not exist.
 */
export async function loadAgentsFromDirectory(
  directory: string,
): Promise<AgentInfoWithId[]> {
  const resolved = path.resolve(directory);
  let files: string[];
  try {
    files = await findMarkdownFiles(resolved);
  } catch {
    return [];
  }
  const result: AgentInfoWithId[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = matter(raw);
    const frontmatterResult = AgentFrontmatterSchema.safeParse(parsed.data);
    if (!frontmatterResult.success) continue;

    const fm = frontmatterResult.data;
    const id = fm.id ?? idFromFilePath(filePath);
    const systemPrompt = parsed.content.trim();
    const toolIds = fm.toolIds ?? toolsToToolIds(fm.tools);

    const config = {
      name: fm.name ?? id,
      description: fm.description,
      mode: fm.mode ?? 'main',
      native: false as const,
      hidden: fm.hidden,
      systemPrompt: systemPrompt || undefined,
      model: parseModel(fm.model),
      steps: fm.steps,
      temperature: fm.temperature,
      topP: fm.topP,
      color: fm.color,
      options: { ...(toolIds != null && { toolIds }) },
    };

    const validated = AgentInfoSchema.safeParse(config);
    if (!validated.success) continue;

    result.push(Agent.define(id, validated.data));
  }

  return result;
}
