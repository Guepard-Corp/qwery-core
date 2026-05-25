import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

/**
 * Session — the persistent unit of a user's interaction with qwery (ADR #34).
 * Wraps an ordered sequence of messages, references the datasources the user
 * is working with, and persists across process lifetimes (resumable via /resume).
 */
export const SessionSchema = z.object({
  id: z.uuid().describe('The unique identifier for the session'),
  projectId: z.uuid().optional().describe('The project (working directory) this session belongs to'),
  title: z.string().describe('The title of the session'),
  seedMessage: z.string().optional().describe('The first prompt that started the session'),
  slug: z.string().describe('Short shareable id'),
  datasources: z.array(z.string().min(1)).default([]).describe('Datasource ids attached to this session'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionInputSchema = z.object({
  title: z.string().min(1),
  projectId: z.uuid().optional(),
  seedMessage: z.string().optional(),
  datasources: z.array(z.string().min(1)).optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const UpdateSessionInputSchema = SessionSchema.pick({
  title: true,
  seedMessage: true,
  datasources: true,
}).partial();
export type UpdateSessionInput = z.infer<typeof UpdateSessionInputSchema>;

export const SessionOutputSchema = SessionSchema;
export type SessionOutput = z.infer<typeof SessionOutputSchema>;

export function createSession(input: CreateSessionInput): Session {
  const { id, slug } = generateIdentity();
  const now = new Date();
  return SessionSchema.parse({
    id,
    slug,
    projectId: input.projectId,
    title: input.title,
    seedMessage: input.seedMessage,
    datasources: input.datasources ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

export function updateSession(current: Session, input: UpdateSessionInput): Session {
  return SessionSchema.parse({
    ...current,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.seedMessage !== undefined && { seedMessage: input.seedMessage }),
    ...(input.datasources !== undefined && { datasources: input.datasources }),
    updatedAt: new Date(),
  });
}
