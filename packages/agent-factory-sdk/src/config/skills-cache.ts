/** Browser-safe in-memory skills cache. Populated by loadSkillsFromDirectory (Node only). */
export type SkillInfo = {
  name: string;
  description: string;
  content: string;
};

const cache = new Map<string, SkillInfo>();

export function getSkills(): SkillInfo[] {
  return Array.from(cache.values());
}

export function getSkill(name: string): SkillInfo | undefined {
  return cache.get(name);
}

/** Used by Node-only loadSkillsFromDirectory to populate the cache. */
export function setSkills(skills: SkillInfo[]): void {
  cache.clear();
  for (const s of skills) {
    cache.set(s.name, s);
  }
}
