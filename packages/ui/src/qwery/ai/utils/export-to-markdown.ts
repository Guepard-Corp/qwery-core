import type { UIMessage, ToolUIPart } from 'ai';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import { getUserFriendlyToolName } from './tool-name';
import { getToolStatusLabel } from './message-context';

export interface ExportToMarkdownOptions {
  getChartSvg?: (messageId: string, partIndex: number) => string | null;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 100);
}

export function downloadMarkdown(content: string, filename: string): void {
  const sanitized = sanitizeFilename(filename);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatToolPart(
  part: ToolUIPart,
  messageId: string,
  partIndex: number,
  options: ExportToMarkdownOptions,
): string {
  let toolName = 'Tool';

  if (
    'toolName' in part &&
    typeof part.toolName === 'string' &&
    part.toolName.trim()
  ) {
    const rawName = part.toolName.trim();
    const formatted = rawName.startsWith('tool-')
      ? getUserFriendlyToolName(rawName, part, { includeChartType: true })
      : getUserFriendlyToolName(`tool-${rawName}`, part, {
          includeChartType: true,
        });
    if (formatted && formatted.trim()) {
      toolName = formatted;
    }
  }

  if (toolName === 'Tool' && part.type && typeof part.type === 'string') {
    const formatted = getUserFriendlyToolName(part.type, part, {
      includeChartType: true,
    });
    if (formatted && formatted.trim()) {
      toolName = formatted;
    } else {
      const formattedFromType =
        part.type.replace(/^tool-/, '').replace(/-/g, ' ') || 'Tool';
      toolName = formattedFromType
        .split(' ')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
    }
  }

  const status = part.state ? getToolStatusLabel(part.state) : null;
  const statusText = status ? ` (${status})` : '';

  let result = `### ${toolName}${statusText}\n\n`;

  if (part.type === 'tool-generateChart' && part.output) {
    const output = part.output as { title?: string; chartType?: string } | null;
    const chartTitle = output?.title || 'Chart';
    result += `**Chart Type:** ${output?.chartType || 'Unknown'}\n\n`;

    if (options.getChartSvg) {
      const svg = options.getChartSvg(messageId, partIndex);
      if (svg) {
        result += `\`\`\`svg\n${svg}\n\`\`\`\n\n`;
      } else {
        result += `<!-- Chart: ${chartTitle} - SVG not available -->\n\n`;
      }
    } else {
      result += `<!-- Chart: ${chartTitle} -->\n\n`;
    }
  } else {
    if (part.input) {
      try {
        const inputStr =
          typeof part.input === 'string'
            ? part.input
            : JSON.stringify(part.input, null, 2);
        result += `**Input:**\n\`\`\`json\n${inputStr}\n\`\`\`\n\n`;
      } catch {
        result += `**Input:** ${String(part.input)}\n\n`;
      }
    }

    if (part.output) {
      try {
        const outputStr =
          typeof part.output === 'string'
            ? part.output
            : JSON.stringify(part.output, null, 2);
        result += `**Output:**\n\`\`\`json\n${outputStr}\n\`\`\`\n\n`;
      } catch {
        result += `**Output:** ${String(part.output)}\n\n`;
      }
    }

    if (part.errorText) {
      result += `**Error:** ${part.errorText}\n\n`;
    }
  }

  return result;
}

export function messageToMarkdown(
  message: UIMessage,
  options: ExportToMarkdownOptions = {},
): string {
  const parts: string[] = [];

  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];
    if (!part) continue;

    if (part.type === 'text' && 'text' in part && part.text?.trim()) {
      parts.push(part.text.trim());
    } else if (
      part.type === 'reasoning' &&
      'text' in part &&
      part.text?.trim()
    ) {
      parts.push(`**Reasoning:**\n\n${part.text.trim()}`);
    } else if (part.type.startsWith('tool-')) {
      const toolPart = part as ToolUIPart;
      parts.push(formatToolPart(toolPart, message.id, i, options));
    }
  }

  return parts.join('\n\n');
}

export function messagesToMarkdown(
  messages: UIMessage[],
  conversationTitle?: string,
  options: ExportToMarkdownOptions = {},
): string {
  const title = conversationTitle
    ? `# ${conversationTitle}\n\n`
    : `# Chat Export\n\n`;

  const date = new Date().toISOString().slice(0, 10);
  const header = `${title}**Exported:** ${date}\n\n---\n\n`;

  const messageSections: string[] = [];

  for (const message of messages) {
    const role =
      message.role === 'assistant'
        ? 'Assistant'
        : message.role === 'user'
          ? 'User'
          : message.role;
    const content = messageToMarkdown(message, options);
    messageSections.push(`## ${role}\n\n${content}`);
  }

  return header + messageSections.join('\n\n---\n\n');
}

export type DownloadChatMarkdownOptions = ExportToMarkdownOptions & {
  conversationTitle?: string;
  /** If omitted, a default is derived from title or date */
  filename?: string;
};

export function buildChatMarkdownFilenameBase(
  conversationTitle?: string | null,
  fallbackSlug?: string | null,
): string {
  const raw =
    conversationTitle?.trim() || fallbackSlug?.trim() || 'conversation';
  return (
    raw
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'conversation'
  );
}

export function findPrecedingUserMessage(
  messages: UIMessage[],
  assistantMessageId: string,
): UIMessage | undefined {
  const messageIndex = messages.findIndex((m) => m.id === assistantMessageId);
  if (messageIndex < 0) return undefined;
  for (let i = messageIndex - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && normalizeUIRole(m.role) === 'user') return m;
  }
  return undefined;
}

export function downloadFullChatMarkdown(
  messages: UIMessage[],
  options: DownloadChatMarkdownOptions = {},
): void {
  const { conversationTitle, filename, getChartSvg } = options;
  const md = messagesToMarkdown(messages, conversationTitle, { getChartSvg });
  const outName =
    filename?.trim() ??
    (conversationTitle?.trim()
      ? `chat-${buildChatMarkdownFilenameBase(conversationTitle)}`
      : `chat-${new Date().toISOString().slice(0, 10)}`);
  downloadMarkdown(md, outName);
}

export function downloadChatMarkdownUpTo(
  messages: UIMessage[],
  upToMessageId: string,
  options: DownloadChatMarkdownOptions = {},
): void {
  const idx = messages.findIndex((m) => m.id === upToMessageId);
  if (idx < 0) return;
  const slice = messages.slice(0, idx + 1);
  const { conversationTitle, filename, getChartSvg } = options;
  const md = messagesToMarkdown(slice, conversationTitle, { getChartSvg });
  const defaultFilename =
    filename?.trim() ??
    (conversationTitle?.trim()
      ? conversationTitle.trim()
      : `chat-${new Date().toISOString().slice(0, 10)}`);
  downloadMarkdown(md, defaultFilename);
}

export type DownloadAssistantResponseMarkdownOptions =
  ExportToMarkdownOptions & {
    conversationTitle?: string;
  };

export function downloadAssistantResponseMarkdown(
  messages: UIMessage[],
  assistantMessageId: string,
  options: DownloadAssistantResponseMarkdownOptions = {},
): void {
  const assistant = messages.find((m) => m.id === assistantMessageId);
  if (!assistant) return;

  const user = findPrecedingUserMessage(messages, assistantMessageId);
  const toExport = user ? [user, assistant] : [assistant];
  const md = messagesToMarkdown(toExport, undefined, options);

  const date = new Date().toISOString().slice(0, 10);
  const titlePart = options.conversationTitle?.trim()
    ? `${options.conversationTitle.trim()}-`
    : '';
  downloadMarkdown(
    md,
    `${titlePart}response-${date}-${assistantMessageId.slice(0, 8)}`,
  );
}
