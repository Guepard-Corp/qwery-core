import { UIMessage } from 'ai';

/**
 * Sanitizes an array of UIMessages to ensure they comply with AI SDK requirements.
 * Specifically:
 * 1. Filters out messages with empty parts arrays.
 * 2. Ensures assistant messages have at least one part (adds an empty text part if needed).
 */
export function sanitizeMessages(messages: UIMessage[]): UIMessage[] {
    if (!messages || !Array.isArray(messages)) return [];

    return messages
        .filter((msg) => msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0)
        .map((msg) => {
            // For assistant messages, ensure there's at least one text part if it's otherwise empty or only has data
            const hasText = msg.parts.some((p) => p.type === 'text');
            if (!hasText && msg.role === 'assistant') {
                return {
                    ...msg,
                    parts: [...msg.parts, { type: 'text', text: '' }],
                };
            }
            return msg;
        });
}
