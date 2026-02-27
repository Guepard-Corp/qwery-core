import type { UIMessage } from 'ai';

function datetimeSuffix(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = d.getFullYear().toString().slice(-2);
  return `${y}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Fallback export filename when the agent does not provide exportFilename.
 * Uses a simple base name plus datetime so exports are distinguishable.
 */
export function generateExportFilename(
  _messages: UIMessage[],
  _messageId: string,
  _sqlQuery?: string,
  _columnNames?: string[],
): string {
  return `query-results-${datetimeSuffix()}`;
}
