import { type UIMessage } from 'ai';
import {
  IMessageRepository,
  IConversationRepository,
} from '@qwery/domain/repositories';
import { CreateMessageService } from '@qwery/domain/services';
import { MessageOutput } from '@qwery/domain/usecases';
import {
  messageRoleToUIRole,
  normalizeUIRole,
  uiRoleToMessageRole,
  type UIMessageRole,
} from '@qwery/shared/message-role-utils';
import { getLogger } from '@qwery/shared/logger';

/**
 * Validates if a string is a valid UUID format
 * Required because client-side message IDs (from useChat) may not be UUIDs,
 * but the database expects UUID format for the id column
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Converts a UIMessage to the format that should be stored in MessageEntity.content.
 * Metadata is stored only at the message root (input.metadata), not in content.
 */
function convertUIMessageToContent(
  uiMessage: UIMessage,
): Record<string, unknown> {
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    parts: uiMessage.parts,
  };
}

export type PersistMessageOptions = {
  createdBy?: string;
  /** Merged into each message's metadata when saving (e.g. modelId, providerId, agent). */
  defaultMetadata?: {
    modelId?: string;
    providerId?: string;
    agent?: string;
  };
};

export class MessagePersistenceService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly conversationSlug: string,
  ) {}
  async persistMessages(
    messages: UIMessage[],
    createdBy?: string,
    options?: PersistMessageOptions,
  ): Promise<{ errors: Error[] }> {
    const useCase = new CreateMessageService(
      this.messageRepository,
      this.conversationRepository,
    );

    const errors: Error[] = [];

    const opts = options ?? {};
    let resolvedCreatedBy: string | null = null;
    try {
      const conversation = await this.conversationRepository.findBySlug(
        this.conversationSlug,
      );
      if (conversation && conversation.createdBy?.trim()) {
        resolvedCreatedBy = conversation.createdBy;
      } else if (opts.createdBy?.trim()) {
        resolvedCreatedBy = opts.createdBy;
      } else if (createdBy?.trim()) {
        resolvedCreatedBy = createdBy;
      }
    } catch (error) {
      const logger = await getLogger();
      logger.error(
        'Error resolving conversation for message persistence:',
        error,
      );
    }

    if (!resolvedCreatedBy) {
      const logger = await getLogger();
      logger.warn(
        `MessagePersistenceService: no valid createdBy resolved for conversation '${this.conversationSlug}', skipping persistence`,
      );
      return { errors: [] };
    }

    // Persist each message with idempotency check
    for (const message of messages) {
      try {
        // Check if message already exists (idempotency)
        // Only check if message.id is a valid UUID format
        // Client-side IDs from useChat may not be UUIDs, so we validate before querying
        if (message.id && message.id.trim() !== '' && isUUID(message.id)) {
          try {
            const existingMessage = await this.messageRepository.findById(
              message.id,
            );
            if (existingMessage) {
              // Message already exists, skip
              continue;
            }
          } catch (error) {
            const logger = await getLogger();
            logger.error('Error checking if message already exists:', error);
          }
        }

        const messageMeta =
          message.metadata && typeof message.metadata === 'object'
            ? (message.metadata as Record<string, unknown>)
            : {};
        const mergedMetadata = {
          ...opts.defaultMetadata,
          ...messageMeta,
        };
        const hasMetadata = Object.keys(mergedMetadata).length > 0;
        const metadataInput = hasMetadata ? { metadata: mergedMetadata } : {};

        await useCase.execute({
          input: {
            content: convertUIMessageToContent(message),
            role: uiRoleToMessageRole(message.role),
            createdBy: resolvedCreatedBy,
            ...metadataInput,
          },
          conversationSlug: this.conversationSlug,
        });
      } catch (error) {
        // Check if error is due to duplicate (idempotency)
        if (
          error instanceof Error &&
          (error.message.includes('already exists') ||
            error.message.includes('UNIQUE constraint'))
        ) {
          // Message already exists, skip (idempotent)
          continue;
        }
        // Record other errors
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return { errors };
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
        // Content has parts/role; metadata lives at message root only
        return {
          id: message.id, // Use MessageEntity.id as source of truth
          role: normalizeUIRole(message.content.role),
          metadata: (message.metadata as UIMessage['metadata']) ?? undefined,
          parts: message.content.parts as UIMessage['parts'],
        };
      }

      // Fallback: Legacy format - reconstruct from MessageRole and content
      const role: UIMessageRole = messageRoleToUIRole(message.role);

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
