import type { UIMessage } from 'ai';

/**
 * Generate a semantic filename for export based on conversation context
 */
export function generateExportFilename(
  messages: UIMessage[],
  messageId: string,
  sqlQuery?: string,
  columnNames?: string[],
): string {
  const currentMessageIndex = messages.findIndex((m) => m.id === messageId);
  if (currentMessageIndex === -1) {
    return 'query-results';
  }

  const currentMessage = messages[currentMessageIndex];
  if (!currentMessage) {
    return 'query-results';
  }

  const previousMessages = messages.slice(0, currentMessageIndex);

  const userMessage = [...previousMessages]
    .reverse()
    .find((m) => m.role === 'user');

  const userMessageText = userMessage
    ? userMessage.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join(' ')
        .trim()
        .substring(0, 200) || ''
    : '';

  const agentResponseText =
    currentMessage.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join(' ')
      .trim()
      .substring(0, 200) || '';

  let filename = 'query-results';

  if (sqlQuery) {
    const selectMatch = sqlQuery.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const tableName = selectMatch[2];
      filename = `${tableName}-results`;
    } else {
      const sqlWords = sqlQuery
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3)
        .join('-')
        .toLowerCase();
      if (sqlWords) {
        filename = sqlWords;
      }
    }
  } else if (userMessageText) {
    const words = userMessageText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 4)
      .join('-')
      .toLowerCase();
    if (words) {
      filename = words;
    }
  }

  if (columnNames && columnNames.length > 0 && filename === 'query-results') {
    const firstColumn = columnNames[0];
    if (firstColumn) {
      const cleanedColumn = firstColumn
        .replace(/[^\w]/g, '-')
        .toLowerCase()
        .substring(0, 20);
      if (cleanedColumn) {
        filename = `${cleanedColumn}-results`;
      }
    }
  }

  filename = filename
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .substring(0, 50);

  return filename || 'query-results';
}