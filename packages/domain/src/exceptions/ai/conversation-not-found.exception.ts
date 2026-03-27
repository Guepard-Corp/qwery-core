export class ConversationNotFoundError extends Error {
  constructor(public readonly conversationSlug: string) {
    super(`Conversation with slug '${conversationSlug}' not found`);
    this.name = 'ConversationNotFoundError';
  }
}
