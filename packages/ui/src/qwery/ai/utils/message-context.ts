import type { UIMessage, ToolUIPart } from 'ai';
import { parseMessageWithContext } from '../user-message-bubble';
import { getUserFriendlyToolName } from './tool-name';

const CONTEXT_MARKER = '__QWERY_CONTEXT__';
const CONTEXT_END_MARKER = '__QWERY_CONTEXT_END__';

export function cleanContextMarkers(
  text: string,
  options?: { removeWorkflowGuidance?: boolean },
): string {
  const { removeWorkflowGuidance = false } = options ?? {};
  let cleaned = text;
  let previousCleaned = '';
  while (cleaned !== previousCleaned) {
    previousCleaned = cleaned;
    cleaned = cleaned.replace(
      new RegExp(
        CONTEXT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '.*?' +
          CONTEXT_END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gs',
      ),
      '',
    );
  }
  cleaned = cleaned.replace(/__QWERY_SUGGESTION_GUIDANCE__/g, '');
  cleaned = cleaned.replace(/__QWERY_SUGGESTION_GUIDANCE_END__/g, '');
  if (removeWorkflowGuidance) {
    cleaned = cleaned.replace(
      /\[SUGGESTION WORKFLOW GUIDANCE\][\s\S]*?(?=\n\n|$)/g,
      '',
    );
  }
  return cleaned;
}

export function getToolStatusLabel(state: string | undefined): string {
  const statusMap: Record<string, string> = {
    'input-streaming': 'Pending',
    'input-available': 'Processing',
    'approval-requested': 'Awaiting Approval',
    'approval-responded': 'Responded',
    'output-available': 'Completed',
    'output-error': 'Error',
    'output-denied': 'Denied',
  };
  return statusMap[state ?? ''] ?? state ?? 'Unknown';
}

export function formatToolCalls(parts: UIMessage['parts']): string {
  const toolCalls: string[] = [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.type === 'text' && 'text' in part && part.text.trim()) {
      textParts.push(part.text.trim());
    } else if (part.type.startsWith('tool-')) {
      const toolPart = part as ToolUIPart;

      let toolName: string = 'Tool';

      // Try to get tool name from toolName property first
      if (
        'toolName' in toolPart &&
        typeof toolPart.toolName === 'string' &&
        toolPart.toolName.trim()
      ) {
        const rawName = toolPart.toolName.trim();
        const formatted = rawName.startsWith('tool-')
          ? getUserFriendlyToolName(rawName)
          : getUserFriendlyToolName(`tool-${rawName}`);
        if (formatted && formatted.trim()) {
          toolName = formatted;
        }
      }
      
      // Fallback to part.type if toolName is still 'Tool' or empty
      if (toolName === 'Tool' && part.type && typeof part.type === 'string') {
        const formatted = getUserFriendlyToolName(part.type);
        if (formatted && formatted.trim()) {
          toolName = formatted;
        }
      }

      // Ensure we always have a valid tool name
      if (!toolName || toolName.trim() === '') {
        toolName = part.type.replace(/^tool-/, '').replace(/-/g, ' ') || 'Tool';
        // Capitalize first letter of each word
        toolName = toolName
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }

      const status = toolPart.state ? getToolStatusLabel(toolPart.state) : null;

      if (status) {
        toolCalls.push(`**${toolName}** called (${status})`);
      } else {
        toolCalls.push(`**${toolName}** called`);
      }
    }
  }

  const result: string[] = [];
  if (toolCalls.length > 0) {
    if (toolCalls.length === 1 && toolCalls[0]) {
      result.push(toolCalls[0]);
    } else {
      result.push(toolCalls.map((tc) => `- ${tc}`).join('\n'));
    }
  }

  if (textParts.length > 0) {
    const textContent = textParts.join('\n\n').trim();
    if (textContent) {
      result.push(textContent);
    }
  }

  return result.join('\n\n');
}

function getTextContentFromMessage(message: UIMessage): string {
  const textParts: string[] = [];
  for (const part of message.parts) {
    if (part.type === 'text' && 'text' in part && part.text?.trim()) {
      textParts.push(part.text.trim());
    }
  }
  return textParts.join('\n\n').trim();
}

export function getContextMessages(
  messages: UIMessage[] | undefined,
  currentMessageId: string | undefined,
  textContent?: string,
): { lastAssistantResponse?: string; parentConversationId?: string } {
  if (!messages || !currentMessageId) {
    return {};
  }

  const currentIndex = messages.findIndex((m) => m.id === currentMessageId);
  if (currentIndex === -1) {
    return {};
  }

  const currentMessage = messages[currentIndex];

  let lastAssistantResponse: string | undefined;
  let parentConversationId: string | undefined;

  if (currentMessage?.role === 'assistant') {
    const textContent = getTextContentFromMessage(currentMessage);
    if (textContent) {
      lastAssistantResponse = textContent;
      const previousUserMsg = messages[currentIndex - 1];
      if (previousUserMsg?.role === 'user') {
        parentConversationId = `parent-${previousUserMsg.id}-${currentMessage.id}`;
      }
    }
  } else {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === 'assistant') {
        const textContent = getTextContentFromMessage(msg);
        if (textContent) {
          lastAssistantResponse = textContent;
          const previousUserMsg = messages[i - 1];
          if (previousUserMsg?.role === 'user') {
            parentConversationId = `parent-${previousUserMsg.id}-${msg.id}`;
          }
          break;
        }
      }
    }
  }

  return { lastAssistantResponse, parentConversationId };
}
