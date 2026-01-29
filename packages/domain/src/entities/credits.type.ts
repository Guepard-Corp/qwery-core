import { z } from 'zod/v3';

export const CreditsSchema = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .describe('The unique identifier for the credits'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  amount: z.number().int().min(0).describe('The amount of credits'),
  createdAt: z
    .date()
    .optional()
    .describe('The date and time the credits were created'),
  updatedAt: z
    .date()
    .optional()
    .describe('The date and time the credits were last updated'),
  createdBy: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('The user who created the credits'),
  updatedBy: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('The user who last updated the credits'),
});
