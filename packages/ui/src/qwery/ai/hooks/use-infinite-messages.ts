import { useState, useCallback, useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import type { MessageOutput } from '@qwery/domain/usecases';
import { MessageRole } from '@qwery/domain/entities';
import type { PaginatedResult } from '@qwery/domain/common';
import {
  messageRoleToUIRole,
  normalizeUIRole,
  type UIMessageRole,
} from '@qwery/shared/message-role-utils';

export const DEFAULT_MESSAGES_PER_PAGE = 10;

const ADAPTIVE_PAGE_SIZES = {
  small: 10, // < 100 messages
  medium: 20, // 100-500 messages
  large: 50, // 500-1000 messages
  xlarge: 100, // > 1000 messages
} as const;

/**
 * Calculates adaptive page size based on current message count
 * @param currentCount - Current number of messages loaded
 * @returns Optimal page size for next load
 */
export function getAdaptivePageSize(currentCount: number): number {
  if (currentCount < 100) {
    return ADAPTIVE_PAGE_SIZES.small;
  } else if (currentCount < 500) {
    return ADAPTIVE_PAGE_SIZES.medium;
  } else if (currentCount < 1000) {
    return ADAPTIVE_PAGE_SIZES.large;
  } else {
    return ADAPTIVE_PAGE_SIZES.xlarge;
  }
}

/**
 * Starting value for firstItemIndex in Virtuoso.
 * High number allows prepending older messages without negative indices.
 */
const FIRST_ITEM_INDEX_START = 100000;

interface UseInfiniteMessagesOptions {
  conversationSlug: string;
  initialMessages: UIMessage[];
  messagesPerPage?: number;
}

interface UseInfiniteMessagesReturn {
  messages: UIMessage[];
  firstItemIndex: number;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  loadError: Error | null;
  loadOlderMessages: () => Promise<void>;
  retryLoadOlder: () => void;
  addNewMessage: (message: UIMessage) => void;
  updateMessage: (id: string, updates: Partial<UIMessage>) => void;
  mergeMessages: (newMessages: UIMessage[]) => void;
}

/**
 * Converts MessageOutput[] to UIMessage[]
 * This is a simplified version of the conversion logic
 */
function convertMessageOutputToUIMessage(message: MessageOutput): UIMessage {
  const createdAt =
    message.createdAt instanceof Date
      ? message.createdAt.toISOString()
      : new Date(message.createdAt).toISOString();

  if (
    typeof message.content === 'object' &&
    message.content !== null &&
    'parts' in message.content &&
    Array.isArray(message.content.parts) &&
    'role' in message.content
  ) {
    const existingMetadata =
      'metadata' in message.content
        ? (message.content.metadata as Record<string, unknown>)
        : {};

    return {
      id: message.id,
      role: normalizeUIRole(message.content.role),
      metadata: {
        ...existingMetadata,
        createdAt,
      },
      parts: message.content.parts as UIMessage['parts'],
    };
  }

  const role: UIMessageRole = messageRoleToUIRole(message.role);

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
    metadata: {
      createdAt,
    },
    parts: [{ type: 'text', text }],
  };
}

/**
 * Extracts ISO timestamp from UIMessage for cursor-based pagination.
 *
 * @param message - UIMessage from @ai-sdk/react
 * @returns ISO timestamp string or null if not found
 *
 */
function extractTimestamp(message: UIMessage): string | null {
  if (message.metadata && typeof message.metadata === 'object') {
    const meta = message.metadata as Record<string, unknown>;
    if (meta.createdAt) {
      if (typeof meta.createdAt === 'string') {
        return meta.createdAt;
      }
      if (meta.createdAt instanceof Date) {
        return meta.createdAt.toISOString();
      }
    }
  }
  console.error('Cannot extract timestamp from message', message);
  return null;
}

/**
 * Finds the oldest message in an array by comparing timestamps.
 * Ensures cursor extraction works regardless of initial message order.
 *
 * @param messages - Array of UIMessage objects
 * @returns The oldest message or null if array is empty or no valid timestamps found
 */
function findOldestMessage(messages: UIMessage[]): UIMessage | null {
  if (messages.length === 0) {
    return null;
  }

  const messagesWithTimestamps = messages
    .map((message) => ({
      message,
      timestamp: extractTimestamp(message),
    }))
    .filter(
      (item): item is { message: UIMessage; timestamp: string } =>
        item.timestamp !== null,
    );

  if (messagesWithTimestamps.length === 0) {
    return null;
  }

  messagesWithTimestamps.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  return messagesWithTimestamps[0]?.message ?? null;
}

export function useInfiniteMessages(
  options: UseInfiniteMessagesOptions,
): UseInfiniteMessagesReturn {
  const {
    conversationSlug,
    initialMessages,
    messagesPerPage = DEFAULT_MESSAGES_PER_PAGE,
  } = options;

  const [firstItemIndex, setFirstItemIndex] = useState(FIRST_ITEM_INDEX_START);
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [olderCursor, setOlderCursor] = useState<string | null>(() => {
    const oldest = findOldestMessage(initialMessages);
    return oldest ? extractTimestamp(oldest) : null;
  });

  const lastSyncedLengthRef = useRef(0);
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesLengthRef = useRef(messages.length);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!Array.isArray(initialMessages)) {
      console.warn('initialMessages is not an array, resetting to empty array');
      setMessages([]);
      setFirstItemIndex(FIRST_ITEM_INDEX_START);
      setHasMoreOlder(false);
      setOlderCursor(null);
      setLoadError(null);
      lastSyncedLengthRef.current = 0;
      return;
    }

    setMessages(initialMessages);
    setFirstItemIndex(FIRST_ITEM_INDEX_START);

    const oldest = findOldestMessage(initialMessages);
    if (oldest) {
      const cursor = extractTimestamp(oldest);
      if (cursor) {
        setOlderCursor(cursor);
        setHasMoreOlder(initialMessages.length >= messagesPerPage);
      } else {
        console.warn(
          'Could not extract cursor from oldest message, assuming no more messages',
        );
        setHasMoreOlder(false);
        setOlderCursor(null);
      }
    } else {
      setHasMoreOlder(false);
      setOlderCursor(null);
    }
    setLoadError(null);
    lastSyncedLengthRef.current = initialMessages.length;
    messagesLengthRef.current = initialMessages.length;
  }, [initialMessages, messagesPerPage]);

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
        activeTimeoutRef.current = null;
      }
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
    };
  }, []);

  /**
   * Loads older messages when user scrolls to top of chat.
   * Uses cursor-based pagination to fetch messages before the current oldest message.
   *
   * Guards:
   * - Returns early if already loading (prevents duplicate requests)
   * - Returns early if no more messages exist (hasMoreOlder = false)
   * - Returns early if cursor is null (no reference point)
   *
   * @returns Promise that resolves when messages are loaded and state updated
   */
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlder) return;

    if (!olderCursor) {
      setHasMoreOlder(false);
      return;
    }

    if (!conversationSlug || conversationSlug.trim() === '') {
      setLoadError(new Error('Invalid conversation slug'));
      return;
    }

    setIsLoadingOlder(true);
    setLoadError(null);

    try {
      const controller = new AbortController();
      activeAbortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      activeTimeoutRef.current = timeoutId;

      const adaptivePageSize =
        messagesPerPage || getAdaptivePageSize(messagesLengthRef.current);

      const params = new URLSearchParams({
        conversationSlug,
        cursor: olderCursor,
        limit: String(adaptivePageSize),
      });

      const response = await fetch(`/api/messages?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (activeTimeoutRef.current === timeoutId) {
        clearTimeout(timeoutId);
        activeTimeoutRef.current = null;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: response.statusText || 'Unknown error',
        }));

        if (response.status === 404) {
          throw new Error(error.error || 'Conversation not found');
        } else if (response.status === 400) {
          throw new Error(error.error || 'Invalid request parameters');
        } else if (response.status >= 500) {
          throw new Error(
            error.error || 'Server error. Please try again later.',
          );
        } else {
          throw new Error(
            error.error ||
              error.message ||
              `Failed to load messages: ${response.statusText} (${response.status})`,
          );
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const result = await response.json();

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from server');
      }

      if (!('messages' in result)) {
        throw new Error('Invalid response format: missing messages field');
      }

      const { messages: olderMessages, nextCursor, hasMore } = result;

      if (!Array.isArray(olderMessages)) {
        throw new Error('Invalid messages format in response');
      }

      if (nextCursor !== null && nextCursor !== undefined && typeof nextCursor !== 'string') {
        throw new Error('Invalid response format: nextCursor must be string or null');
      }
      if (hasMore !== null && hasMore !== undefined && typeof hasMore !== 'boolean') {
        throw new Error('Invalid response format: hasMore must be boolean or null');
      }

      if (olderMessages.length === 0) {
        setHasMoreOlder(false);
      } else {
        const messageOutputs = olderMessages as MessageOutput[];
        const convertedMessages = messageOutputs
          .map((output) => {
            try {
              return convertMessageOutputToUIMessage(output);
            } catch (error) {
              console.warn('Failed to convert message:', output, error);
              return null;
            }
          })
          .filter((msg): msg is UIMessage => msg !== null);

        if (convertedMessages.length > 0) {
          setFirstItemIndex((prev) => prev - convertedMessages.length);
          setMessages((prev) => [...convertedMessages, ...prev]);

          if (nextCursor && typeof nextCursor === 'string') {
            setOlderCursor(nextCursor);
          }
          
          if (typeof hasMore === 'boolean') {
            setHasMoreOlder(hasMore);
          } else {
            const adaptivePageSize =
              messagesPerPage || getAdaptivePageSize(messagesLengthRef.current);
            setHasMoreOlder(convertedMessages.length >= adaptivePageSize);
          }
        } else {
          setHasMoreOlder(false);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setLoadError(new Error('Request timed out. Please try again.'));
      } else if (
        error instanceof TypeError &&
        error.message.includes('fetch')
      ) {
        setLoadError(
          new Error(
            'Network error. Please check your connection and try again.',
          ),
        );
      } else {
        console.error('Failed to load older messages:', error);
        setLoadError(
          error instanceof Error ? error : new Error('Failed to load messages'),
        );
      }
    } finally {
      // Always clear timeout to prevent memory leaks
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
        activeTimeoutRef.current = null;
      }
      // Clear AbortController ref (controller itself is already cleaned up by timeout or completion)
      activeAbortControllerRef.current = null;
      setIsLoadingOlder(false);
    }
  }, [
    conversationSlug,
    olderCursor,
    isLoadingOlder,
    hasMoreOlder,
    messagesPerPage,
  ]);

  const retryLoadOlder = useCallback(() => {
    setLoadError(null);
    loadOlderMessages();
  }, [loadOlderMessages]);

  const addNewMessage = useCallback((message: UIMessage) => {
    if (!message || !message.id) {
      console.warn('addNewMessage received invalid message, ignoring');
      return;
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback(
    (id: string, updates: Partial<UIMessage>) => {
      if (!id || typeof id !== 'string') {
        console.warn('updateMessage received invalid id, ignoring');
        return;
      }
      if (!updates || typeof updates !== 'object') {
        console.warn('updateMessage received invalid updates, ignoring');
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
    },
    [],
  );

  /**
   * Merges new messages from useChat with existing virtualized messages.
   * Optimized to only process new messages using lastSyncedLengthRef.
   *
   * Handles three scenarios:
   * 1. Conversation switch (length decreased) - full reset
   * 2. New messages added (length increased) - append new, update existing
   * 3. Streaming updates (same length) - update existing messages only
   *
   * @param newMessages - Array of messages from useChat (may include new or updated messages)
   */
  const mergeMessages = useCallback((newMessages: UIMessage[]) => {
    if (!Array.isArray(newMessages)) {
      console.warn('mergeMessages received non-array input, ignoring');
      return;
    }
    if (newMessages.length < lastSyncedLengthRef.current) {
      lastSyncedLengthRef.current = newMessages.length;
      setFirstItemIndex(FIRST_ITEM_INDEX_START);
      setMessages(newMessages);
      return;
    }

    setMessages((prev) => {
      if (newMessages.length > lastSyncedLengthRef.current) {
        const newMessagesToAdd = newMessages.slice(lastSyncedLengthRef.current);
        const existingIds = new Set(prev.map((m) => m.id));
        const toAdd = newMessagesToAdd.filter((m) => !existingIds.has(m.id));
        const toUpdate = newMessagesToAdd.filter((m) => existingIds.has(m.id));

        const updated = prev.map((m) => {
          const update = toUpdate.find((u) => u.id === m.id);
          return update ? { ...m, ...update } : m;
        });

        lastSyncedLengthRef.current = newMessages.length;
        return [...updated, ...toAdd];
      }

      // No new messages, just update existing ones (streaming updates)
      const updateMap = new Map(
        newMessages.map((m) => [m.id, m] as [string, UIMessage]),
      );

      if (updateMap.size === 0) {
        return prev;
      }

      let hasUpdates = false;
      const updated = prev.map((m) => {
        const update = updateMap.get(m.id);
        if (update) {
          hasUpdates = true;
          return { ...m, ...update };
        }
        return m;
      });

      return hasUpdates ? updated : prev;
    });
  }, []);

  return {
    messages,
    firstItemIndex,
    isLoadingOlder,
    hasMoreOlder,
    loadError,
    loadOlderMessages,
    retryLoadOlder,
    addNewMessage,
    updateMessage,
    mergeMessages,
  };
}
