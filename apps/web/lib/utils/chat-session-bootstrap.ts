/** One-shot handoff from dashboard → conversation (this tab only; never survives history navigation). */
const PREFIX = 'qwery:chat-bootstrap:';

export function setChatBootstrapMessage(slug: string, text: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`${PREFIX}${slug}`, text);
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeChatBootstrapMessage(slug: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const key = `${PREFIX}${slug}`;
  try {
    const v = sessionStorage.getItem(key);
    if (v != null) sessionStorage.removeItem(key);
    const t = v?.trim();
    return t ? t : null;
  } catch {
    return null;
  }
}

/** Legacy key; remove so old builds cannot auto-send when browsing history. */
export function clearLegacyPendingChatLocalStorage(slug: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(`pending-message-${slug}`);
  } catch {
    /* ignore */
  }
}
