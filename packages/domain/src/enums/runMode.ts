import { z } from 'zod/v3';

export const RunModeSchema = z.enum(['default', 'fixit']);

export type RunMode = z.infer<typeof RunModeSchema>;
