import { DefaultChatTransport } from 'ai';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';

export const defaultTransport = (api: string) =>
  new DefaultChatTransport({
    api,
    prepareSendMessagesRequest: (request) => {
      const { messages, body = {} } = request;
      const lastUserMessageIndex = messages.findLastIndex(
        (m) => normalizeUIRole(m.role) === 'user',
      );
      const lastUserMessage =
        lastUserMessageIndex >= 0 ? messages[lastUserMessageIndex] : undefined;
      return {
        body: {
          ...body,
          messages: lastUserMessage ? [lastUserMessage] : [],
        },
      };
    },
  });
