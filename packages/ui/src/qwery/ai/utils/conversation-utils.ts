export interface Conversation {
  id: string;
  slug: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Formats a date as a relative time string (e.g., "Today at 3:45 PM", "Yesterday at 2:30 PM")
 */
export function formatRelativeTime(date: Date, isCurrent = false): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // For current conversation, show "now" or "few seconds ago"
  if (isCurrent) {
    if (diffSeconds < 5) {
      return 'now';
    }
    if (diffSeconds < 60) {
      return 'few seconds ago';
    }
  }

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year} at ${timeStr}`;
}

/**
 * Formats a date as a relative date string for grouping (e.g., "Today", "Yesterday", "15 January 2024")
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Groups conversations by date, separating the current conversation
 */
export function groupConversationsByTime(
  conversations: Conversation[],
  currentConversationId?: string,
): {
  currentConversation: Conversation | null;
  groups: Record<string, Conversation[]>;
} {
  const groups: Record<string, Conversation[]> = {};
  let currentConversation: Conversation | null = null;

  conversations.forEach((conversation) => {
    if (conversation.id === currentConversationId) {
      currentConversation = conversation;
      return;
    }

    const group = formatRelativeDate(conversation.updatedAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group]!.push(conversation);
  });

  Object.keys(groups).forEach((key) => {
    const group = groups[key];
    if (group) {
      group.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
  });

  return { currentConversation, groups };
}

/**
 * Parses a date string in the format "day month year" (e.g., "15 January 2024")
 */
function parseDateString(dateStr: string): Date | null {
  const parts = dateStr.split(' ');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(year) && monthName) {
      const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
      if (!isNaN(monthIndex)) {
        return new Date(year, monthIndex, day);
      }
    }
  }
  return null;
}

/**
 * Sorts time group keys in chronological order (Today, Yesterday, then by date)
 */
export function sortTimeGroups(
  groups: Record<string, Conversation[]>,
): string[] {
  const keys = Object.keys(groups);
  return keys.sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;

    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    const dateA = parseDateString(a);
    const dateB = parseDateString(b);

    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }

    return a.localeCompare(b);
  });
}
