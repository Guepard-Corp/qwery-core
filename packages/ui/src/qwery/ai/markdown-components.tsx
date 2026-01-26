import * as React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { cn } from '../../lib/utils';
import { createContext, useContext, useEffect } from 'react';
import { MarkdownContext } from './message-parts';
import { SuggestionButton } from './suggestion-button';
import { UIMessage } from 'ai';
import { Sparkles, Copy, Download } from 'lucide-react';
import { CHAT_UI_MARGINS } from './chat-ui-config';
import {
  detectCodeLanguage,
  getLanguageLabel,
  getLanguageExtension,
  isSQL,
} from './code-language-utils';

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  node?: unknown;
};

// Context to track current heading
export const HeadingContext = createContext<{
  currentHeading: string;
  setCurrentHeading: (heading: string) => void;
}>({
  currentHeading: '',
  setCurrentHeading: () => {},
});

// Create a factory function that returns components with context access
export const createAgentMarkdownComponents = (): Components => {
  const isSuggestionHeading = (heading: string): boolean => {
    const lowerHeading = heading.toLowerCase();
    return (
      lowerHeading.includes('suggested next steps') ||
      lowerHeading.includes('example queries') ||
      lowerHeading.includes('suggestions') ||
      lowerHeading.includes('you can ask')
    );
  };

  const isQuestion = (text: string): boolean => {
    return text.trim().endsWith('?');
  };

  const extractTextFromChildren = (children: ReactNode): string => {
    if (typeof children === 'string') {
      return children;
    }
    if (Array.isArray(children)) {
      return children.map(extractTextFromChildren).join('');
    }
    if (React.isValidElement(children)) {
      const props = children.props as { children?: ReactNode };
      if (props.children) {
        return extractTextFromChildren(props.children);
      }
    }
    return '';
  };

  const getContextMessages = (
    messages: UIMessage[] | undefined,
    currentMessageId: string | undefined,
  ): { lastAssistantResponse?: string; parentConversationId?: string } => {
    if (!messages || !currentMessageId) {
      return {};
    }

    const currentIndex = messages.findIndex((m) => m.id === currentMessageId);
    if (currentIndex === -1) {
      return {};
    }

    // Find last assistant message before current (the response to the previous question)
    let lastAssistantResponse: string | undefined;
    let parentConversationId: string | undefined;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === 'assistant') {
        const textPart = msg.parts.find((p) => p.type === 'text');
        if (textPart && 'text' in textPart && textPart.text.trim()) {
          lastAssistantResponse = textPart.text;
          // Generate parent ID for this question-response pair
          const previousUserMsg = messages[i - 1];
          if (previousUserMsg?.role === 'user') {
            parentConversationId = `parent-${previousUserMsg.id}-${msg.id}`;
          }
          break;
        }
      }
    }

    return { lastAssistantResponse, parentConversationId };
  };

  return {
    h1: ({ className, ...props }) => (
      <h1
        {...props}
        className={cn(
          'mt-4 mb-2 text-2xl leading-tight font-semibold',
          className,
        )}
      />
    ),
    h2: ({ className, children, ...props }) => {
      const H2Component = () => {
        const { setCurrentHeading } = useContext(HeadingContext);
        const headingText = extractTextFromChildren(children);
        useEffect(() => {
          if (isSuggestionHeading(headingText)) {
            setCurrentHeading(headingText);
          }
        }, [headingText, setCurrentHeading]);
        return (
          <h2
            {...props}
            className={cn(
              'overflow-wrap-anywhere mt-3 mb-2 text-xl leading-tight font-semibold break-words',
              className,
            )}
          >
            {children}
          </h2>
        );
      };
      return <H2Component />;
    },
    h3: ({ className, children, ...props }) => {
      const H3Component = () => {
        const { setCurrentHeading } = useContext(HeadingContext);
        const headingText = extractTextFromChildren(children);
        useEffect(() => {
          if (isSuggestionHeading(headingText)) {
            setCurrentHeading(headingText);
          }
        }, [headingText, setCurrentHeading]);
        return (
          <h3
            {...props}
            className={cn(
              'overflow-wrap-anywhere mt-3 mb-2 text-lg leading-tight font-semibold break-words',
              className,
            )}
          >
            {children}
          </h3>
        );
      };
      return <H3Component />;
    },
    p: ({ className, ...props }) => (
      <p
        {...props}
        className={cn(
          'overflow-wrap-anywhere my-2 text-sm leading-6 break-words',
          className,
        )}
      />
    ),
    a: ({ className, href, ...props }) => (
      <a
        {...props}
        href={href}
        className={cn(
          'text-primary decoration-primary/50 hover:decoration-primary overflow-wrap-anywhere break-words underline underline-offset-2 transition',
          className,
        )}
        target="_blank"
        rel="noreferrer"
      />
    ),
    ul: ({ className, children, ...props }) => (
      <ul
        {...props}
        className={cn(
          'overflow-wrap-anywhere my-2 min-w-0 list-disc pl-6 text-sm leading-6 break-words',
          className,
        )}
      >
        {children}
      </ul>
    ),
    ol: ({ className, children, ...props }) => (
      <ol
        {...props}
        className={cn(
          'overflow-wrap-anywhere my-2 min-w-0 list-decimal pl-6 text-sm leading-6 break-words',
          className,
        )}
      >
        {children}
      </ol>
    ),
    li: ({ className, children, ...props }) => {
      const LiComponent = () => {
        const markdownContext = useContext(MarkdownContext);
        const { currentHeading } = useContext(HeadingContext);
        const itemText = extractTextFromChildren(children);
        const isUnderSuggestionHeading = isSuggestionHeading(currentHeading);
        const isQuestionItem = isQuestion(itemText);
        const isSuggestion = isUnderSuggestionHeading || isQuestionItem;

        if (isSuggestion && markdownContext.sendMessage) {
          const handleClick = () => {
            const { lastAssistantResponse, parentConversationId } =
              getContextMessages(
                markdownContext.messages,
                markdownContext.currentMessageId,
              );

            let messageText = itemText;

            // Build context template if we have previous messages
            if (lastAssistantResponse || parentConversationId) {
              const contextData = JSON.stringify({
                lastAssistantResponse,
                parentConversationId,
              });
              messageText = `__QWERY_CONTEXT__${contextData}__QWERY_CONTEXT_END__${itemText}`;
            }

            if (markdownContext.sendMessage) {
              markdownContext.sendMessage(
                {
                  text: messageText,
                },
                {},
              );
            }
          };

          return (
            <li
              {...props}
              className={cn(
                'marker:text-muted-foreground overflow-wrap-anywhere relative my-1 min-w-0 pr-6 text-sm leading-6 break-words',
                className,
              )}
            >
              {children}
              <SuggestionButton onClick={handleClick} />
            </li>
          );
        }

        return (
          <li
            {...props}
            className={cn(
              'marker:text-muted-foreground overflow-wrap-anywhere my-1 min-w-0 text-sm leading-6 break-words',
              className,
            )}
          >
            {children}
          </li>
        );
      };
      return <LiComponent />;
    },
    blockquote: ({ className, ...props }) => (
      <blockquote
        {...props}
        className={cn(
          'border-border/60 text-muted-foreground overflow-wrap-anywhere my-4 border-l-2 pl-4 text-sm break-words italic',
          className,
        )}
      />
    ),
    code: ({ inline, className, children, ...props }: MarkdownCodeProps) => {
      if (inline) {
        return (
          <code
            {...props}
            className={cn(
              'bg-muted/60 rounded px-1.5 py-0.5 font-mono text-xs',
              className,
            )}
          >
            {children}
          </code>
        );
      }

      const codeText =
        typeof children === 'string'
          ? children
          : Array.isArray(children)
            ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
            : '';

      const detectedLanguage = detectCodeLanguage(
        codeText,
        className || undefined,
      );
      const languageLabel = getLanguageLabel(detectedLanguage);
      const languageExtension = getLanguageExtension(detectedLanguage);
      const codeIsSQL = isSQL(detectedLanguage);

      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(codeText);
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      };

      const handleDownload = () => {
        const blob = new Blob([codeText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `code-${Date.now()}.${languageExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      return (
        <div
          data-code-block-container="true"
          className={cn(
            'group relative min-w-0 overflow-hidden rounded-md',
            'w-full max-w-[28rem]',
            CHAT_UI_MARGINS,
          )}
        >
          <div
            className={cn(
              'code-block-header rounded-t-md bg-[hsl(0_0%_2%)] px-3 py-2 dark:bg-[hsl(0_0%_2%)]',
            )}
            style={{ backgroundColor: 'hsl(0, 0%, 2%)' }}
            data-code-block-header="true"
          >
            <div className="flex items-center justify-between">
              <span className="text-foreground text-xs font-medium">
                {languageLabel}
              </span>
              <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleCopy}
                  className="bg-background/80 hover:bg-background border-border text-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded border transition-colors"
                  title="Copy code"
                  type="button"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-background/80 hover:bg-background border-border text-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded border transition-colors"
                  title="Download code"
                  type="button"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <pre
            className={cn(
              'text-foreground relative my-0 w-full max-w-full overflow-x-auto rounded-t-none rounded-b-md p-4 text-base',
              codeIsSQL
                ? 'bg-[hsl(0_0%_2%)] dark:bg-[hsl(0_0%_2%)] [&_*]:!bg-transparent [&_code]:!bg-transparent [&_span]:!bg-transparent'
                : 'bg-muted/80 dark:bg-muted/90',
              className,
            )}
            style={
              codeIsSQL
                ? {
                    backgroundColor: 'hsl(0, 0%, 2%)',
                  }
                : undefined
            }
          >
            <code
              {...props}
              className="max-w-full font-mono leading-6 break-words whitespace-pre-wrap"
              style={
                codeIsSQL
                  ? {
                      backgroundColor: 'transparent !important',
                      color: 'inherit',
                    }
                  : undefined
              }
            >
              {children}
            </code>
          </pre>
        </div>
      );
    },
    table: ({ className, ...props }) => (
      <div
        className="my-4 w-full max-w-full min-w-0 overflow-x-auto"
        style={{ maxWidth: '100%' }}
      >
        <table
          {...props}
          className={cn(
            '[&_tr:nth-child(even)]:bg-muted/30 w-full border-collapse text-left text-sm [&_td]:max-w-0 [&_td]:py-2 [&_td]:align-top [&_td]:break-words [&_th]:border-b [&_th]:pb-2 [&_th]:text-xs [&_th]:break-words',
            className,
          )}
          style={{ width: '100%', maxWidth: '100%' }}
        />
      </div>
    ),
    hr: ({ className, ...props }) => (
      <hr {...props} className={cn('border-border my-4 border-t', className)} />
    ),
    strong: ({ className, children, ...props }) => {
      const StrongComponent = () => {
        const { currentHeading } = useContext(HeadingContext);
        const isUnderSuggestionHeading = isSuggestionHeading(currentHeading);
        const itemText = extractTextFromChildren(children);
        const isQuestionItem = isQuestion(itemText);
        const isSuggestion = isUnderSuggestionHeading || isQuestionItem;

        if (isSuggestion) {
          return (
            <strong
              {...props}
              className={cn(
                'inline-flex items-center gap-1.5 font-semibold',
                className,
              )}
            >
              <Sparkles className="text-primary/70 inline-block h-3 w-3 shrink-0" />
              {children}
            </strong>
          );
        }

        return (
          <strong {...props} className={cn('font-semibold', className)}>
            {children}
          </strong>
        );
      };
      return <StrongComponent />;
    },
    em: ({ className, ...props }) => (
      <em {...props} className={cn('italic', className)} />
    ),
    img: ({ className, ...props }) => (
      <img
        {...props}
        className={cn('h-auto max-w-full rounded-md', className)}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    ),
  };
};

// Export the default components (will be created fresh for each render)
export const agentMarkdownComponents: Components =
  createAgentMarkdownComponents();
