import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { projectSlugFromPath } from '../utils/project-slug';

/**
 * Project — a working directory that owns its own conversations and the
 * datasources attached to it. The current project is resolved from
 * `process.cwd()` (see `projectSlugFromPath`); a row is created lazily the
 * first time qwery runs in a directory. Datasources relate to projects
 * many-to-many (a datasource can be attached to several projects); sessions
 * belong to a single project.
 */
export const ProjectSchema = z.object({
  id: z.uuid().describe('The unique identifier for the project'),
  slug: z
    .string()
    .min(1)
    .describe('Canonical path with OS separators normalized to "-"; resolves the project from the cwd'),
  path: z.string().min(1).describe('Canonical absolute path of the project directory'),
  name: z.string().min(1).describe('Display name (the directory base name)'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  path: z.string().min(1).describe('Canonical absolute path of the working directory'),
  name: z.string().min(1).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/** Last path segment of a (possibly Windows or POSIX) absolute path. */
function baseName(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts.at(-1) ?? p;
}

export function createProject(input: CreateProjectInput): Project {
  const now = new Date();
  return ProjectSchema.parse({
    id: uuidv4(),
    slug: projectSlugFromPath(input.path),
    path: input.path,
    name: input.name ?? baseName(input.path),
    createdAt: now,
    updatedAt: now,
  });
}
