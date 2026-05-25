import { z } from 'zod';
import { generateIdentity } from '../utils/identity.generator';

/**
 * An Agent is a configurable agent definition: a role (system prompt + behavior),
 * a set of allowed tools (capabilities), and operational policies (e.g. max steps,
 * destructive-op confirmation). The default qwery agent ships as a first-party
 * Agent entity; extensions may register additional ones.
 */
export const AgentSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1024).default(''),
  role: z.string().min(1).describe('System prompt / role definition for the agent'),
  capabilities: z
    .array(z.string())
    .default([])
    .describe('Tool names the agent is allowed to call (e.g. schema, runQuery, present)'),
  policies: z
    .array(z.string())
    .default([])
    .describe('Operational policies (e.g. require-confirmation-on-destructive)'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const CreateAgentInputSchema = AgentSchema.pick({
  name: true,
  description: true,
  role: true,
  capabilities: true,
  policies: true,
}).partial({ description: true, capabilities: true, policies: true });
export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

export const UpdateAgentInputSchema = AgentSchema.pick({
  name: true,
  description: true,
  role: true,
  capabilities: true,
  policies: true,
}).partial();
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

export const AgentOutputSchema = AgentSchema;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;

export function createAgent(input: CreateAgentInput): Agent {
  const { id, slug } = generateIdentity();
  const now = new Date();
  return AgentSchema.parse({
    id,
    slug,
    name: input.name,
    description: input.description ?? '',
    role: input.role,
    capabilities: input.capabilities ?? [],
    policies: input.policies ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

export function updateAgent(current: Agent, input: UpdateAgentInput): Agent {
  return AgentSchema.parse({
    ...current,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.role !== undefined && { role: input.role }),
    ...(input.capabilities !== undefined && { capabilities: input.capabilities }),
    ...(input.policies !== undefined && { policies: input.policies }),
    updatedAt: new Date(),
  });
}
