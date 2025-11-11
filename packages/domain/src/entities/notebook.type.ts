import { z } from 'zod';

export const CellTypeSchema = z.enum(['text', 'query', 'prompt', 'code']);

export type CellType = z.infer<typeof CellTypeSchema>;

export const RunModeSchema = z.enum(['default', 'fixit']);

export type RunMode = z.infer<typeof RunModeSchema>;

/**
 * Notebook schema
 * Notebook is a collection of cells that can be run in order.
 * This schema is used to validate the notebook data
 */
export const NotebookSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the notebook'),
  projectId: z
    .string()
    .uuid()
    .describe('The unique identifier for the project'),
  name: z.string().min(1).max(255).describe('The name of the notebook'),
  title: z.string().min(1).max(255).describe('The title of the notebook'),
  description: z
    .string()
    .min(1)
    .max(1024)
    .describe('The description of the notebook'),
  slug: z.string().min(1).describe('The slug of the notebook'),
  version: z.number().int().min(1).describe('The version of the notebook'),
  createdAt: z.date().describe('The date and time the notebook was created'),
  updatedAt: z
    .date()
    .describe('The date and time the notebook was last updated'),
  datasources: z
    .array(z.string().min(1))
    .describe('The datasources to use for the Notebook'),

  cells: z.array(
    z.object({
      query: z.string().optional().describe('The query of the cell'),
      cellType: z.enum(CellTypeSchema.options).describe('The type of the cell'),
      cellId: z.number().int().min(1).describe('The cell identifier'),
      datasources: z
        .array(z.string().min(1))
        .describe('The datasources to use for the cell'),
      isActive: z.boolean().describe('Whether the cell is active'),
      runMode: z
        .enum(RunModeSchema.options)
        .describe('The run mode of the cell'),
    }),
  ),
});

export type Notebook = z.infer<typeof NotebookSchema>;
