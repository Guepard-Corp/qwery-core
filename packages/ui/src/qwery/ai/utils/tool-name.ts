import type { ToolUIPart } from 'ai';
import type { ChartType } from '../charts/chart-type-selector';

export type ToolNameContext = {
  output?: { chartType?: ChartType | null };
  input?: { chartType?: ChartType | null };
};

function getChartTypeFromUnknown(
  value: unknown,
): ChartType | string | null | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const maybe = value as {
    input?: { chartType?: ChartType | string | null } | null;
    output?: { chartType?: ChartType | string | null } | null;
  };

  return maybe.output?.chartType ?? maybe.input?.chartType ?? undefined;
}

export function getToolChartType(part: unknown): ChartType | string | null {
  return getChartTypeFromUnknown(part) ?? null;
}

export function getUserFriendlyToolName(type: string): string;
export function getUserFriendlyToolName(
  type: string,
  context?: ToolNameContext,
): string;
export function getUserFriendlyToolName(
  type: string,
  partOrContext: ToolNameContext | ToolUIPart,
  options: { includeChartType?: boolean },
): string;
export function getUserFriendlyToolName(
  type: string,
  partOrContext?: unknown,
  _options?: { includeChartType?: boolean },
): string {
  if (!type || typeof type !== 'string' || !type.trim()) {
    return 'Tool';
  }

  const normalizedType = type.trim();
  const nameMap: Record<string, string> = {
    'tool-testConnection': 'Test Connection',
    'tool-renameTable': 'Rename Table',
    'tool-deleteTable': 'Delete Table',
    'tool-getSchema': 'Get Schema',
    'tool-getTableSchema': 'Get Table Schema',
    'tool-runQuery': 'Run Query',
    'tool-runQueries': 'Run Multiple Queries',
    'tool-selectChartType': 'Select Chart Type',
    'tool-generateChart': 'Create Chart',
    'tool-deleteSheet': 'Delete Sheet',
    'tool-readLinkData': 'Read Link Data',
    'tool-api_call': 'API Call',
    'tool-listViews': 'List Views',
    'tool-webfetch': 'Web search',
  };

  let mappedName = nameMap[normalizedType];

  // Dynamic naming logic for charts
  const baseType = normalizedType.replace(/^tool-/, '');
  if (baseType === 'generateChart' || baseType === 'selectChartType') {
    const chartType = getChartTypeFromUnknown(partOrContext);
    if (chartType) {
      const formattedChartType =
        chartType.charAt(0).toUpperCase() + chartType.slice(1).toLowerCase();
      // If we don't have a mapped name yet, use a default one
      const baseLabel =
        mappedName ||
        (baseType === 'generateChart' ? 'Generate Chart' : 'Select Chart Type');
      mappedName = `${baseLabel} (${formattedChartType})`;
    }
  }

  if (mappedName) {
    return mappedName;
  }

  const words = normalizedType
    .replace(/^tool-/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .split(' ')
    .filter((word) => word.length > 0);

  const formatted = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return formatted || 'Tool';
}
