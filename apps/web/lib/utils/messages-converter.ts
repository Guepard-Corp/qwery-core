import { MessageOutput } from '@qwery/domain/usecases';
import { UIMessage } from '@qwery/agent-factory-sdk';
import {
  messageRoleToUIRole,
  normalizeUIRole,
  type UIMessageRole,
} from '@qwery/shared/message-role-utils';

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
    const createdAt =
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : new Date(message.createdAt).toISOString();

    if (
      typeof message.content === 'object' &&
      message.content !== null &&
      'parts' in message.content &&
      Array.isArray(message.content.parts) &&
      'role' in message.content
    ) {
      const existingMetadata =
        'metadata' in message.content
          ? (message.content.metadata as Record<string, unknown>)
          : {};

      return {
        id: message.id,
        role: normalizeUIRole(message.content.role),
        metadata: {
          ...existingMetadata,
          createdAt,
        },
        parts: message.content.parts as UIMessage['parts'],
      };
    }

    // Fallback: Legacy format - reconstruct from MessageRole and content
    const role: UIMessageRole = messageRoleToUIRole(message.role);

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
      metadata: {
        createdAt,
      },
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
