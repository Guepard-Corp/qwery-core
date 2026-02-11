import { z } from 'zod';
import { Tool } from './tool';
import { getSkill, getSkills } from '../config/skills-cache';

const DESCRIPTION = `
Load a skill by name to get detailed instructions and conventions for a specific task.
Skills provide specialized knowledge (e.g. DuckDB patterns, SQL naming, security).
Call without a name to list available skills (name + description); then call again with a name to load that skill's content.
`;

export const GetSkillTool = Tool.define('get_skill', {
  description: DESCRIPTION,
  parameters: z.object({
    name: z
      .string()
      .optional()
      .describe('Skill identifier. Omit to list available skills.'),
  }),
  async execute(params, _ctx) {
    const skills = getSkills();
    if (skills.length === 0) {
      return 'No skills loaded. Load skills from a directory (e.g. .qwery/skills/) first.';
    }
    if (params.name) {
      const skill = getSkill(params.name);
      if (!skill) {
        const available = skills.map((s) => s.name).join(', ');
        return `Skill "${params.name}" not found. Available: ${available}`;
      }
      return `## Skill: ${skill.name}\n\n${skill.description ? `**Description**: ${skill.description}\n\n` : ''}${skill.content}`;
    }
    const list = skills
      .map((s) => `- **${s.name}**: ${s.description || '(no description)'}`)
      .join('\n');
    return `Available skills:\n\n${list}\n\nCall get_skill with a name to load that skill's content.`;
  },
});
