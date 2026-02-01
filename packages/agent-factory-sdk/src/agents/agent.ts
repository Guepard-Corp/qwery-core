import { z } from 'zod';

export const AgentInfoSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    mode: z.enum(['main', 'delegate', 'all']),
    native: z.boolean().optional(),
    hidden: z.boolean().optional(),
    topP: z.number().optional(),
    temperature: z.number().optional(),
    color: z.string().optional(),
    model: z
      .object({
        modelID: z.string(),
        providerID: z.string(),
      })
      .optional(),
    systemPrompt: z.string().optional(),
    options: z.record(z.string(), z.any()),
    steps: z.number().int().positive().optional(),
  })
  .meta({
    ref: 'Agent',
  });

export type AgentInfo = z.infer<typeof AgentInfoSchema>;

export type AgentInfoWithId = AgentInfo & { id: string };

export const Agent = {
  define(
    id: string,
    config: Omit<AgentInfo, 'id'> & { id?: string },
  ): AgentInfoWithId {
    return { id, ...config } as AgentInfoWithId;
  },
};
