import { MessageOutput } from '@qwery/domain/usecases';
import { MessageRole } from '@qwery/domain/entities';
import { UIMessage } from '@qwery/agent-factory-sdk';

/**
 * Converts MessageOutput[] to UIMessage[]
 * The UIMessage structure is stored in the MessageOutput.content field
 */
export function convertMessages(
  messages: MessageOutput[] | undefined,
): UIMessage[] | undefined {
  if (!messages) {
    return undefined;
  }

  return messages.map((message) => {
    // Check if content already contains a UIMessage structure (with parts and role)
    if (
      typeof message.content === 'object' &&
      message.content !== null &&
      'parts' in message.content &&
      Array.isArray(message.content.parts) &&
      'role' in message.content
    ) {
      // Content already contains full UIMessage structure - restore all fields
      return {
        id: message.id, // Use MessageEntity.id as source of truth
        role: message.content.role as 'user' | 'assistant' | 'system',
        metadata:
          'metadata' in message.content ? message.content.metadata : undefined,
        parts: message.content.parts as UIMessage['parts'],
      };
    }

    // Fallback: Legacy format - reconstruct from MessageRole and content
    // Map MessageRole enum to UIMessage role string
    // Note: MessageRole.ASSISTANT maps to 'assistant' in UIMessage
    let role: 'user' | 'assistant' | 'system';
    if (message.role === MessageRole.USER) {
      role = 'user';
    } else if (message.role === MessageRole.ASSISTANT) {
      role = 'assistant';
    } else if (message.role === MessageRole.SYSTEM) {
      role = 'system';
    } else {
      role = 'assistant';
    }

    // Extract text from content object (legacy format)
    const text =
      typeof message.content === 'object' &&
      message.content !== null &&
      'text' in message.content
        ? String(message.content.text)
        : typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);

    return {
      id: message.id,
      role,
      parts: [{ type: 'text', text }],
    };
  });
}

/**
 * Converts a UIMessage to the format that should be stored in MessageEntity.content
 * This stores the full UIMessage structure (id, role, metadata, parts) in the content field
 * for complete restoration to the UI
 */
export function convertUIMessageToContent(
  uiMessage: UIMessage,
): Record<string, unknown> {
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    metadata: uiMessage.metadata,
    parts: uiMessage.parts,
  };
}
