export function getUserFriendlyToolName(type: string): string {
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
    'tool-generateChart': 'Generate Chart',
    'tool-deleteSheet': 'Delete Sheet',
    'tool-readLinkData': 'Read Link Data',
    'tool-api_call': 'API Call',
    'tool-listViews': 'List Views',
  };

  const mappedName = nameMap[normalizedType];
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
