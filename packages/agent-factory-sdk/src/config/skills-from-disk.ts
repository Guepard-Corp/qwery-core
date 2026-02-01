import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillInfo } from './skills-cache';
import { setSkills } from './skills-cache';

async function findSkillFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await findSkillFiles(full)));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      result.push(full);
    }
  }
  return result;
}

/**
 * Load skills from SKILL.md files in a directory (e.g. `.qwery/skills/`).
 * Node only. Populates the shared skills cache used by the get_skill tool.
 * Returns [] if the directory does not exist.
 */
export async function loadSkillsFromDirectory(
  directory: string,
): Promise<SkillInfo[]> {
  const resolved = path.resolve(directory);
  let files: string[];
  try {
    files = await findSkillFiles(resolved);
  } catch {
    return [];
  }

  const result: SkillInfo[] = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = matter(raw);
    const name =
      (parsed.data?.name as string) ?? path.basename(path.dirname(filePath));
    const description = (parsed.data?.description as string) ?? '';
    const content = parsed.content.trim();
    result.push({ name, description, content });
  }
  setSkills(result);
  return result;
}
