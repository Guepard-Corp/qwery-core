/**
 * Chart config shape aligned with web (generateChart tool output).
 * Used to render ASCII charts in the TUI.
 */
export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartConfig {
  chartType: ChartType;
  title?: string;
  data: Array<Record<string, unknown>>;
  config: {
    colors: string[];
    labels?: Record<string, string>;
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

export function parseChartConfig(output: string): ChartConfig | null {
  try {
    const parsed = JSON.parse(output) as unknown;
    if (!isRecord(parsed)) return null;
    const { chartType, data, config } = parsed;
    if (chartType !== 'bar' && chartType !== 'line' && chartType !== 'pie')
      return null;
    if (!Array.isArray(data)) return null;
    if (!isRecord(config) || !Array.isArray(config.colors)) return null;
    return {
      chartType,
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      data: data.filter(isRecord),
      config: {
        colors: config.colors.filter((c: unknown) => typeof c === 'string'),
        labels: isRecord(config.labels)
          ? (config.labels as Record<string, string>)
          : undefined,
        xKey: typeof config.xKey === 'string' ? config.xKey : undefined,
        yKey: typeof config.yKey === 'string' ? config.yKey : undefined,
        nameKey:
          typeof config.nameKey === 'string' ? config.nameKey : undefined,
        valueKey:
          typeof config.valueKey === 'string' ? config.valueKey : undefined,
      },
    };
  } catch {
    return null;
  }
}
