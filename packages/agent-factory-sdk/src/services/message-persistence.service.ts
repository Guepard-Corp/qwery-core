import { type UIMessage } from 'ai';
import {
  IMessageRepository,
  IConversationRepository,
} from '@qwery/domain/repositories';
import { CreateMessageService } from '@qwery/domain/services';
import { MessageRole } from '@qwery/domain/entities';
import { MessageOutput } from '@qwery/domain/usecases';

/**
 * Converts a UIMessage to the format that should be stored in MessageEntity.content
 * This stores the full UIMessage structure (id, role, metadata, parts) in the content field
 * for complete restoration to the UI
 */
function convertUIMessageToContent(
  uiMessage: UIMessage,
): Record<string, unknown> {
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    metadata: uiMessage.metadata,
    parts: uiMessage.parts,
  };
}

/**
 * Maps UIMessage role to MessageRole enum
 */
function mapUIRoleToMessageRole(role: UIMessage['role']): MessageRole {
  switch (role) {
    case 'user':
      return MessageRole.USER;
    case 'assistant':
      return MessageRole.ASSISTANT;
    case 'system':
      return MessageRole.SYSTEM;
    default:
      return MessageRole.ASSISTANT;
  }
}

export class MessagePersistenceService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly conversationSlug: string,
  ) {}

  /**
   * Persists UIMessages to the database
   * @param messages - Array of UIMessages to persist
   * @param createdBy - User/agent identifier who created the messages (default: 'agent')
   */
  async persistMessages(
    messages: UIMessage[],
    createdBy: string = 'agent',
  ): Promise<void> {
    const useCase = new CreateMessageService(
      this.messageRepository,
      this.conversationRepository,
    );

    // Persist each message
    for (const message of messages) {
      await useCase.execute({
        input: {
          content: convertUIMessageToContent(message),
          role: mapUIRoleToMessageRole(message.role),
          createdBy,
        },
        conversationSlug: this.conversationSlug,
      });
    }
  }

  /**
   * Converts MessageOutput[] to UIMessage[]
   * The UIMessage structure is stored in the MessageOutput.content field
   * @param messages - Array of MessageOutput to convert
   * @returns Array of UIMessage
   */
  static convertToUIMessages(messages: MessageOutput[]): UIMessage[] {
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
            'metadata' in message.content
              ? (message.content.metadata as UIMessage['metadata'])
              : undefined,
          parts: message.content.parts as UIMessage['parts'],
        };
      }

      // Fallback: Legacy format - reconstruct from MessageRole and content
      // Map MessageRole enum to UIMessage role string
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
}
