import { z } from 'zod';

/**
 * Chart types supported by the system.
 * To add new chart types, simply add them to this array.
 */
export const CHART_TYPES = ['bar', 'line', 'pie'] as const;

/**
 * TypeScript type for chart types.
 * Automatically inferred from CHART_TYPES array.
 */
export type ChartType = (typeof CHART_TYPES)[number];

/**
 * Zod schema for chart types.
 * Automatically created from CHART_TYPES array.
 */
export const ChartTypeSchema = z.enum(CHART_TYPES);

export const ChartTypeSelectionSchema = z.object({
  chartType: ChartTypeSchema,
  reasoningText: z.string(),
});

export type ChartTypeSelection = z.infer<typeof ChartTypeSelectionSchema>;

export const ChartConfigSchema = z.object({
  chartType: ChartTypeSchema,
  title: z.string().optional(),
  data: z.array(z.record(z.string(), z.unknown())),
  config: z.object({
    colors: z.array(z.string()),
    labels: z.record(z.string(), z.string()).optional(),
    xKey: z.string().optional(),
    yKey: z.string().optional(),
    nameKey: z.string().optional(),
    valueKey: z.string().optional(),
  }),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;
