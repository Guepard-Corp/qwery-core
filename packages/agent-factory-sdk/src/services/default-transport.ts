import { DefaultChatTransport } from 'ai';

export const defaultTransport = (api: string) =>
  new DefaultChatTransport({
    api: api,
  });
