import { defaultTransport } from './default-transport';

function getChatApiUrl(conversationSlug: string): string {
  const baseUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_CHAT_API_URL) ||
    (typeof process !== 'undefined' && process.env?.QWERY_SERVER_URL);
  if (baseUrl) {
    const base = String(baseUrl).replace(/\/$/, '');
    return `${base}/chat/${conversationSlug}`;
  }
  return `/api/chat/${conversationSlug}`;
}

export const transportFactory = (conversationSlug: string, model: string) => {
  // Handle case where model might not have a provider prefix
  if (!model.includes('/')) {
    return defaultTransport(getChatApiUrl(conversationSlug));
  }

  const [provider] = model.split('/');

  switch (provider) {
    case 'transformer-browser':
    case 'webllm':
    default:
      return defaultTransport(getChatApiUrl(conversationSlug));
  }
};
