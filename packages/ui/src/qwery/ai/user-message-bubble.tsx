'use client';

import { ArrowUpLeft } from 'lucide-react';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { Message, MessageContent } from '../../ai-elements/message';
import { scrollToElementBySelector } from './utils/scroll-utils';
import { DatasourceBadges, type DatasourceItem } from './datasource-badge';
import { cleanContextMarkers } from './utils/message-context';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../shadcn/hover-card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { agentMarkdownComponents } from './markdown-components';
import { BotAvatar } from '../bot-avatar';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import { useState, useEffect, useRef } from 'react';

export interface UserMessageBubbleProps {
  text: string;
  context?: {
    lastAssistantResponse?: string;
    sourceSuggestionId?: string; // ID of the original suggestion element
    parentConversationId?: string; // ID of the question-response duo parent
  };
  messageId: string;
  messages?: Array<{
    id: string;
    role: string;
    parts?: Array<{ type: string; text?: string }>;
  }>; // Messages array to find user question
  className?: string;
  datasources?: DatasourceItem[];
  pluginLogoMap?: Map<string, string>;
}

/**
 * Parses context from message text if it contains the special marker
 * Returns { text: clean text, context: parsed context or undefined }
 * Handles nested context markers by finding the outermost pair
 */
export function parseMessageWithContext(messageText: string): {
  text: string;
  context?: UserMessageBubbleProps['context'];
} {
  const contextMarker = '__QWERY_CONTEXT__';
  const contextEndMarker = '__QWERY_CONTEXT_END__';

  if (!messageText.includes(contextMarker)) {
    return { text: messageText };
  }

  const removeAllContextMarkers = (str: string): string => {
    return cleanContextMarkers(str, { removeWorkflowGuidance: true });
  };

  const lastStartIndex = messageText.lastIndexOf(contextMarker);
  if (lastStartIndex === -1) {
    return { text: removeAllContextMarkers(messageText).trim() || messageText };
  }

  const endIndex = messageText.indexOf(contextEndMarker, lastStartIndex);
  if (endIndex === -1) {
    return { text: removeAllContextMarkers(messageText).trim() || messageText };
  }

  try {
    // Extract the JSON part
    let contextJson = messageText.substring(
      lastStartIndex + contextMarker.length,
      endIndex,
    );

    // First, try to clean nested context markers from the JSON string itself
    // This is tricky because we need to preserve the JSON structure
    contextJson = removeAllContextMarkers(contextJson);

    // Try to parse the JSON
    const parsedContext: UserMessageBubbleProps['context'] = {};
    try {
      const parsed = JSON.parse(contextJson);
      if (parsed && typeof parsed === 'object') {
        if (
          parsed.lastAssistantResponse &&
          typeof parsed.lastAssistantResponse === 'string'
        ) {
          parsedContext.lastAssistantResponse = parsed.lastAssistantResponse;
        }
        if (
          parsed.sourceSuggestionId &&
          typeof parsed.sourceSuggestionId === 'string'
        ) {
          parsedContext.sourceSuggestionId = parsed.sourceSuggestionId;
        }
        if (
          parsed.parentConversationId &&
          typeof parsed.parentConversationId === 'string'
        ) {
          parsedContext.parentConversationId = parsed.parentConversationId;
        }
      }
    } catch {
      // If JSON parsing fails, try to extract fields using a more robust regex
      // Use a safer regex pattern that avoids exponential backtracking
      // Match quoted strings by finding the key, then capturing until the closing quote
      // This pattern uses a non-capturing group with a limited repetition to prevent backtracking
      const lastAssistantResponseRegex =
        /"lastAssistantResponse"\s*:\s*"((?:[^"\\]|\\(?:[\\"nrt]|u[0-9a-fA-F]{4}))*?)"/;
      const sourceSuggestionIdRegex = /"sourceSuggestionId"\s*:\s*"([^"]+)"/;
      const parentConversationIdRegex =
        /"parentConversationId"\s*:\s*"([^"]+)"/;

      const lastAssistantResponseMatch = contextJson.match(
        lastAssistantResponseRegex,
      );
      const sourceSuggestionIdMatch = contextJson.match(
        sourceSuggestionIdRegex,
      );
      const parentConversationIdMatch = contextJson.match(
        parentConversationIdRegex,
      );
      if (lastAssistantResponseMatch && lastAssistantResponseMatch[1]) {
        let value = lastAssistantResponseMatch[1];
        // Remove nested context markers and suggestion guidance markers
        value = removeAllContextMarkers(value);
        // Unescape JSON string - order matters: handle \\ first to avoid double unescaping
        // Use a single pass with a function to handle all escape sequences correctly
        value = value.replace(/\\(.)/g, (match, char) => {
          switch (char) {
            case 'n':
              return '\n';
            case 't':
              return '\t';
            case 'r':
              return '\r';
            case '"':
              return '"';
            case '\\':
              return '\\';
            default:
              return match;
          }
        });
        parsedContext.lastAssistantResponse = value.trim();
      }
      if (sourceSuggestionIdMatch && sourceSuggestionIdMatch[1]) {
        parsedContext.sourceSuggestionId = sourceSuggestionIdMatch[1];
      }
      if (parentConversationIdMatch && parentConversationIdMatch[1]) {
        parsedContext.parentConversationId = parentConversationIdMatch[1];
      }
    }

    // Extract clean text (everything after the last context marker pair)
    let cleanText = messageText
      .substring(endIndex + contextEndMarker.length)
      .trim();

    // Remove suggestion workflow guidance from clean text if present
    const guidanceMarker = '[SUGGESTION WORKFLOW GUIDANCE]';
    let guidanceIndex = cleanText.indexOf(guidanceMarker);
    while (guidanceIndex !== -1) {
      // Find the end of this guidance block (next double newline or end of string)
      const afterMarker = guidanceIndex + guidanceMarker.length;
      const doubleNewlineIndex = cleanText.indexOf('\n\n', afterMarker);
      const endIndex =
        doubleNewlineIndex !== -1 ? doubleNewlineIndex + 2 : cleanText.length;

      // Remove this guidance block
      cleanText =
        cleanText.substring(0, guidanceIndex) + cleanText.substring(endIndex);

      // Check for next occurrence
      guidanceIndex = cleanText.indexOf(guidanceMarker);
    }
    cleanText = cleanText.trim();

    // Clean nested markers from context values (final cleanup)
    if (parsedContext.lastAssistantResponse) {
      parsedContext.lastAssistantResponse = removeAllContextMarkers(
        parsedContext.lastAssistantResponse,
      ).trim();
    }

    // Only return context if it has at least one field
    if (
      parsedContext.lastAssistantResponse ||
      parsedContext.sourceSuggestionId ||
      parsedContext.parentConversationId
    ) {
      return { text: cleanText, context: parsedContext };
    }

    return { text: cleanText };
  } catch {
    // If all parsing fails, return cleaned text without markers
    const cleaned = removeAllContextMarkers(messageText).trim();
    return { text: cleaned || messageText };
  }
}

function findSuggestionInResponse(
  response: string,
  suggestionText: string,
): { before: string; suggestion: string; after: string } | null {
  // Clean the suggestion text for matching (remove markdown, normalize)
  const cleanSuggestion = suggestionText
    .trim()
    .replace(/^[•\-*\d+.)]\s*/, '') // Remove list markers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\*/g, '') // Remove italic markers
    .replace(/`/g, '') // Remove code markers
    .trim();

  if (!cleanSuggestion) return null;

  // Try to find the suggestion in the response (case-insensitive, flexible matching)
  const responseLower = response.toLowerCase();
  const suggestionLower = cleanSuggestion.toLowerCase();

  // Try exact match first
  let index = responseLower.indexOf(suggestionLower);

  // If not found, try matching without special characters
  if (index === -1) {
    const normalizedResponse = responseLower.replace(/[^\w\s]/g, ' ');
    const normalizedSuggestion = suggestionLower.replace(/[^\w\s]/g, ' ');
    index = normalizedResponse.indexOf(normalizedSuggestion);
    if (index !== -1) {
      // Find the actual position in original text
      let charCount = 0;
      for (let i = 0; i < response.length; i++) {
        const char = response[i];
        if (char && /[\w\s]/.test(char)) {
          if (charCount === index) {
            index = i;
            break;
          }
          charCount++;
        }
      }
    }
  }

  if (index === -1) {
    // If suggestion not found, return null to show truncated response
    return null;
  }

  // Extract the actual suggestion text from response (preserve original formatting)
  const before = response.substring(0, index).trim();
  const suggestion = response.substring(index, index + cleanSuggestion.length);
  const after = response.substring(index + cleanSuggestion.length).trim();

  return { before, suggestion, after };
}

function getPreviewText(
  response: string,
  suggestionText: string,
): { preview: React.ReactNode; fullText: string } {
  // Always show the suggestion text in bold (mandatory)
  // Try to find and spotlight the suggestion within the response
  const spotlight = findSuggestionInResponse(response, suggestionText);

  if (spotlight) {
    const { before, suggestion, after } = spotlight;

    const preview = (
      <>
        {before && <span>{before} </span>}
        <span className="font-bold">{suggestion}</span>
        {after && <span> {after}</span>}
      </>
    );

    return { preview, fullText: response };
  }

  // Fallback: if suggestion not found in response, show the suggestion text itself in bold
  // Then show surrounding text from response
  const cleanResponse = response
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  const preview = (
    <>
      <span className="font-bold">{suggestionText}</span>
      {cleanResponse && <span> {cleanResponse}</span>}
    </>
  );

  return { preview, fullText: response };
}

function getUserQuestionFromParentId(
  parentConversationId: string | undefined,
  messages:
    | Array<{
        id: string;
        role: string;
        parts?: Array<{ type: string; text?: string }>;
      }>
    | undefined,
  currentMessageId?: string,
): string | undefined {
  if (!messages) return undefined;

  // Method 1: Try to extract from parentConversationId
  if (parentConversationId) {
    // Extract user message ID from parentConversationId format: "parent-{userMessageId}-{assistantMessageId}"
    const match = parentConversationId.match(/^parent-([^-]+)-(.+)$/);
    if (match && match[1]) {
      const userMessageId = match[1];
      const userMessage = messages.find((m) => m.id === userMessageId);

      if (userMessage && normalizeUIRole(userMessage.role) === 'user') {
        // Extract text from user message parts
        if (userMessage.parts) {
          const textParts = userMessage.parts
            .filter((p) => p.type === 'text' && p.text)
            .map((p) => p.text)
            .filter((t): t is string => typeof t === 'string');

          if (textParts.length > 0) {
            // Parse to get clean text without context markers
            const fullText = textParts.join(' ');
            const { text } = parseMessageWithContext(fullText);
            const cleaned = text.trim();
            if (cleaned) return cleaned;
          }
        }
      }
    }
  }

  // Method 2: Fallback - Find the user message that precedes the assistant response
  // Look backwards from current message to find the previous user message
  if (currentMessageId) {
    const currentIndex = messages.findIndex((m) => m.id === currentMessageId);
    if (currentIndex > 0) {
      // Look backwards from current message to find the previous user message
      for (let i = currentIndex - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg && normalizeUIRole(msg.role) === 'user') {
          // Extract text from user message parts
          if (msg.parts) {
            const textParts = msg.parts
              .filter((p) => p.type === 'text' && p.text)
              .map((p) => p.text)
              .filter((t): t is string => typeof t === 'string');

            if (textParts.length > 0) {
              // Parse to get clean text without context markers
              const fullText = textParts.join(' ');
              const { text } = parseMessageWithContext(fullText);
              const cleaned = text.trim();
              if (cleaned) return cleaned;
            }
          }
          // Found a user message, stop looking
          break;
        }
      }
    }
  }

  return undefined;
}

export function UserMessageBubble({
  text,
  context,
  messages,
  messageId,
  className,
  datasources,
  pluginLogoMap,
}: UserMessageBubbleProps) {
  const hasContext = context && context.lastAssistantResponse;
  const hasSourceSuggestion = context?.sourceSuggestionId;
  const [isHoverCardOpen, setIsHoverCardOpen] = useState(false);
  const hoverCardContentRef = useRef<HTMLDivElement>(null);

  const scrollToSourceSuggestion = () => {
    if (!context?.sourceSuggestionId) return;

    scrollToElementBySelector(
      `[data-suggestion-id="${context.sourceSuggestionId}"]`,
      {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
        offset: -20,
      },
    );
  };

  // Close HoverCard on scroll (only if scrolling outside the popup)
  useEffect(() => {
    if (!isHoverCardOpen) return;

    const handleScroll = (event: Event) => {
      const target = event.target as Node;
      const hoverCardContent = hoverCardContentRef.current;

      // Don't close if scrolling inside the popup content
      if (hoverCardContent && hoverCardContent.contains(target)) {
        return;
      }

      setIsHoverCardOpen(false);
    };

    // Listen to scroll events on window and all scrollable containers
    window.addEventListener('scroll', handleScroll, true);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isHoverCardOpen]);

  const previewData =
    hasContext && context.lastAssistantResponse
      ? getPreviewText(context.lastAssistantResponse ?? '', text)
      : null;

  const userQuestion = getUserQuestionFromParentId(
    context?.parentConversationId,
    messages,
    messageId,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Datasources displayed above the message bubble */}
      {datasources && datasources.length > 0 && (
        <div className="flex w-full max-w-[80%] min-w-0 justify-end overflow-x-hidden">
          <DatasourceBadges
            datasources={datasources}
            pluginLogoMap={pluginLogoMap}
          />
        </div>
      )}
      {/* Horizontal layout: go to suggestion button - previous response preview - message bubble */}
      <div className="flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-hidden">
        {/* Go to suggestion button - on the very left */}
        {hasSourceSuggestion && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
            onClick={scrollToSourceSuggestion}
            title="Scroll to original suggestion"
          >
            <ArrowUpLeft className="size-4" />
          </Button>
        )}
        {/* Previous response preview - fills available space */}
        {previewData && (
          <HoverCard open={isHoverCardOpen} onOpenChange={setIsHoverCardOpen}>
            <HoverCardTrigger asChild>
              <div className="text-muted-foreground hover:text-foreground flex min-w-0 flex-1 cursor-pointer items-center text-xs leading-relaxed transition-colors">
                <span className="line-clamp-2 break-words">
                  {previewData.preview}
                </span>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              ref={hoverCardContentRef}
              className="max-h-[400px] w-96 overflow-y-auto"
              side="top"
              align="start"
            >
              <div className="flex flex-col gap-4">
                {/* User Question - Right side (originating question) */}
                {userQuestion && (
                  <div className="flex items-start justify-end">
                    <Message
                      from="user"
                      className="flex !w-auto max-w-[80%] min-w-0"
                    >
                      <MessageContent className="overflow-wrap-anywhere max-w-full min-w-0 break-words">
                        <span className="text-base font-semibold break-words">
                          {userQuestion}
                        </span>
                      </MessageContent>
                    </Message>
                  </div>
                )}
                {/* Assistant Response - Left side with bot avatar */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <BotAvatar size={6} isLoading={false} />
                  </div>
                  <div className="prose prose-base dark:prose-invert [&_li]:text-foreground [&_p]:text-foreground [&_strong]:text-foreground max-w-none min-w-0 flex-1 [&_li]:my-1 [&_strong]:inline [&_strong]:font-semibold [&_strong]:not-italic [&_ul]:list-inside [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={agentMarkdownComponents}
                    >
                      {previewData.fullText}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
        {/* Message bubble - fills remaining space */}
        <Message
          from="user"
          className={cn('flex !w-auto min-w-0 flex-1', className)}
        >
          <MessageContent
            className="overflow-wrap-anywhere max-w-full min-w-0 break-words"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            <span className="text-base font-semibold break-words">{text}</span>
          </MessageContent>
        </Message>
      </div>
    </div>
  );
}
