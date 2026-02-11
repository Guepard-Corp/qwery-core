import { z } from 'zod';

export const RunModeSchema = z.enum(['default', 'fixit']);

export type RunMode = z.infer<typeof RunModeSchema>;
