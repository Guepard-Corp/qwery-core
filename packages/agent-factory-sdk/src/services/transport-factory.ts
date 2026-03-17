import { defaultTransport } from './default-transport';

declare global {
  interface Window {
    __QWERY_API_URL?: string;
  }
}

function getChatApiUrl(conversationSlug: string): string {
  if (typeof window !== 'undefined' && window.__QWERY_API_URL) {
    const base = String(window.__QWERY_API_URL).replace(/\/$/, '');
    return `${base}/chat/${conversationSlug}`;
  }
  const baseUrl =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_CHAT_API_URL || import.meta.env?.VITE_API_URL)) ||
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
