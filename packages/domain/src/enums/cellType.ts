import { z } from 'zod/v3';

export const CellTypeSchema = z.enum(['text', 'query', 'prompt', 'code']);

export type CellType = z.infer<typeof CellTypeSchema>;
