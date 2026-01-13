/**
 * Truncates text to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Truncates chat/conversation titles with a sensible default length
 * @param title - The chat title to truncate
 * @param maxLength - Maximum length before truncation (default: 40)
 * @returns Truncated title with ellipsis if needed
 */
export function truncateChatTitle(title: string, maxLength = 40): string {
  return truncateText(title, maxLength);
}

