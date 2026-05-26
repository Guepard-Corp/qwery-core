import { describe, expect, test } from 'bun:test';
import { listBuiltinSkills, readLocalSkill } from '../skills';

describe('built-in skills', () => {
  test('ships at least one skill, all with valid metadata', () => {
    const builtin = listBuiltinSkills();
    expect(builtin.length).toBeGreaterThan(0);
    for (const skill of builtin) {
      expect(skill.scope).toBe('builtin');
      expect(skill.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(skill.description.length).toBeGreaterThan(0);
      expect(['data', 'code', 'all']).toContain(skill.agent);
    }
  });

  test('skill names are unique', () => {
    const names = listBuiltinSkills().map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('bundles the safe-destructive-changes skill', () => {
    const names = listBuiltinSkills().map((s) => s.name);
    expect(names).toContain('safe-destructive-changes');
  });

  test('readLocalSkill returns the embedded body for a built-in skill', async () => {
    const result = await readLocalSkill('safe-destructive-changes');
    expect(result).not.toBeNull();
    expect(result?.content).toContain('---');
    expect(result?.content).toContain('name: safe-destructive-changes');
    expect(result?.path).toBe('<builtin>/safe-destructive-changes.md');
  });
});
