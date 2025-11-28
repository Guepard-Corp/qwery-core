'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '../ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
  PromptInputProvider,
  usePromptInputController,
} from '../ai-elements/prompt-input';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  CopyIcon,
  GlobeIcon,
  RefreshCcwIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '../shadcn/button';
import { Textarea } from '../shadcn/textarea';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '../ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '../ai-elements/reasoning';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '../ai-elements/tool';
import { Loader } from '../ai-elements/loader';
import { ChatTransport, UIMessage, ToolUIPart } from 'ai';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { BotAvatar } from './bot-avatar';
import { Sparkles } from 'lucide-react';

const models = [
  {
    name: 'azure/gpt-5-mini',
    value: 'azure/gpt-5-mini',
  },
];

export interface QweryAgentUIProps {
  transport: ChatTransport<UIMessage>;
  onOpen?: () => void;
}

export default function QweryAgentUI(props: QweryAgentUIProps) {
  const { transport, onOpen } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!hasFocusedRef.current && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              entry.intersectionRatio > 0.3 &&
              !hasFocusedRef.current
            ) {
              hasFocusedRef.current = true;
              setTimeout(() => {
                textareaRef.current?.focus();
                onOpen?.();
              }, 300);
            }
          });
        },
        { threshold: 0.3 },
      );

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [onOpen]);

  const [state, setState] = useState({
    input: '',
    model: models[0]?.value ?? '',
    webSearch: false,
  });

  const { messages, sendMessage, status, regenerate, stop, setMessages } =
    useChat({
      transport: transport,
    });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const regenCountRef = useRef<Map<string, number>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  // Handle edit message
  const handleEditStart = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditText(text);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (!editingMessageId || !editText.trim()) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === editingMessageId) {
          return {
            ...msg,
            parts: msg.parts.map((p) =>
              p.type === 'text' ? { ...p, text: editText.trim() } : p,
            ),
          };
        }
        return msg;
      }),
    );

    setEditingMessageId(null);
    setEditText('');
  }, [editingMessageId, editText, setMessages]);

  const handleRegenerate = useCallback(async () => {
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);
    if (lastAssistantMessage) {
      const current = regenCountRef.current.get(lastAssistantMessage.id) ?? 0;
      regenCountRef.current.set(lastAssistantMessage.id, current + 1);
    }

    regenerate();
  }, [messages, regenerate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== textareaRef.current &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const lastAssistantMessage = useMemo(
    () => messages.filter((m) => m.role === 'assistant').at(-1),
    [messages],
  );

  // Compute regen counts for all messages to avoid ref access during render
  const [regenCountsMap, setRegenCountsMap] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    const counts = new Map<string, number>();
    messages.forEach((msg) => {
      counts.set(msg.id, regenCountRef.current.get(msg.id) ?? 0);
    });
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setRegenCountsMap(counts), 0);
  }, [messages]);

  return (
    <PromptInputProvider initialInput={state.input}>
      <div
        ref={containerRef}
        className="relative mx-auto flex h-full w-full max-w-4xl min-w-0 flex-col p-6"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Conversation className="min-h-0 min-w-0 flex-1">
            <ConversationContent className="min-w-0">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title="Start a conversation"
                  description="Ask me anything and I'll help you out. You can ask questions, request code, or get explanations."
                  icon={<Sparkles className="text-muted-foreground size-12" />}
                />
              ) : (
                messages.map((message) => {
                  const sourceParts = message.parts.filter(
                    (part: { type: string }) => part.type === 'source-url',
                  );

                  const textParts = message.parts.filter(
                    (p) => p.type === 'text',
                  );
                  const isLastAssistantMessage =
                    message.id === lastAssistantMessage?.id;
                  const regenCount = regenCountsMap.get(message.id) ?? 0;

                  const lastTextPartIndex =
                    textParts.length > 0
                      ? message.parts.findLastIndex((p) => p.type === 'text')
                      : -1;

                  return (
                    <div key={message.id}>
                      {message.role === 'assistant' &&
                        sourceParts.length > 0 && (
                          <Sources>
                            <SourcesTrigger count={sourceParts.length} />
                            {sourceParts.map((part, i: number) => {
                              const sourcePart = part as {
                                type: 'source-url';
                                url?: string;
                              };
                              return (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source
                                    key={`${message.id}-${i}`}
                                    href={sourcePart.url}
                                    title={sourcePart.url}
                                  />
                                </SourcesContent>
                              );
                            })}
                          </Sources>
                        )}
                      {message.parts.map((part, i: number) => {
                        const isLastTextPart =
                          part.type === 'text' && i === lastTextPartIndex;
                        const isStreaming =
                          status === 'streaming' &&
                          isLastAssistantMessage &&
                          isLastTextPart;
                        const isResponseComplete =
                          !isStreaming &&
                          isLastAssistantMessage &&
                          isLastTextPart;

                        switch (part.type) {
                          case 'text': {
                            const isEditing = editingMessageId === message.id;
                            return (
                              <div
                                key={`${message.id}-${i}`}
                                className={cn(
                                  'flex items-start gap-3',
                                  message.role === 'user' && 'justify-end',
                                  message.role === 'assistant' &&
                                    'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                  message.role === 'user' &&
                                    'animate-in fade-in slide-in-from-bottom-4 duration-300',
                                )}
                              >
                                {message.role === 'assistant' && (
                                  <BotAvatar
                                    size={6}
                                    className="mt-1 shrink-0"
                                  />
                                )}
                                <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2">
                                  {isEditing && message.role === 'user' ? (
                                    <>
                                      <Textarea
                                        value={editText}
                                        onChange={(e) =>
                                          setEditText(e.target.value)
                                        }
                                        className="min-h-[60px] resize-none"
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === 'Enter' &&
                                            (e.metaKey || e.ctrlKey)
                                          ) {
                                            e.preventDefault();
                                            handleEditSubmit();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleEditCancel();
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <div className="mt-1 flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={handleEditSubmit}
                                          className="h-7 w-7"
                                          title="Save"
                                        >
                                          <CheckIcon className="size-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={handleEditCancel}
                                          className="h-7 w-7"
                                          title="Cancel"
                                        >
                                          <XIcon className="size-3" />
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {!isStreaming && (
                                        <Message
                                          from={message.role}
                                          className="w-full"
                                        >
                                          <MessageContent>
                                            <div className="inline-flex items-baseline gap-0.5">
                                              <MessageResponse>
                                                {part.text}
                                              </MessageResponse>
                                            </div>
                                          </MessageContent>
                                        </Message>
                                      )}
                                      {isStreaming && (
                                        <Message
                                          from={message.role}
                                          className="w-full"
                                        >
                                          <MessageContent>
                                            <div className="inline-flex items-baseline gap-0.5">
                                              <MessageResponse>
                                                {part.text}
                                              </MessageResponse>
                                              <span className="inline-block h-4 w-0.5 animate-pulse bg-current" />
                                            </div>
                                          </MessageContent>
                                        </Message>
                                      )}
                                      {/* Actions below the bubble */}
                                      {(isResponseComplete ||
                                        (message.role === 'user' &&
                                          isLastTextPart)) && (
                                        <div
                                          className={cn(
                                            'mt-1 flex items-center gap-2',
                                            message.role === 'user' &&
                                              'justify-end',
                                          )}
                                        >
                                          {message.role === 'assistant' &&
                                            regenCount > 0 && (
                                              <span className="text-muted-foreground text-xs">
                                                Regenerated {regenCount}x
                                              </span>
                                            )}
                                          {message.role === 'assistant' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={handleRegenerate}
                                              className="h-7 w-7"
                                              title="Retry"
                                            >
                                              <RefreshCcwIcon className="size-3" />
                                            </Button>
                                          )}
                                          {message.role === 'user' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                handleEditStart(
                                                  message.id,
                                                  part.text,
                                                )
                                              }
                                              className="h-7 w-7"
                                              title="Edit"
                                            >
                                              <PencilIcon className="size-3" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              navigator.clipboard.writeText(
                                                part.text,
                                              )
                                            }
                                            className="h-7 w-7"
                                            title="Copy"
                                          >
                                            <CopyIcon className="size-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {message.role === 'user' && (
                                  <div className="mt-1 size-6 shrink-0" />
                                )}
                              </div>
                            );
                          }
                          case 'reasoning':
                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="w-full"
                                isStreaming={
                                  status === 'streaming' &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          default:
                            if (part.type.startsWith('tool-')) {
                              const toolPart = part as ToolUIPart;
                              const toolName =
                                'toolName' in toolPart &&
                                typeof toolPart.toolName === 'string'
                                  ? toolPart.toolName
                                  : toolPart.type.replace('tool-', '');
                              const inProgressStates = new Set([
                                'input-streaming',
                                'input-available',
                                'approval-requested',
                              ]);
                              const isToolInProgress = inProgressStates.has(
                                toolPart.state as string,
                              );

                              return (
                                <Tool
                                  key={`${message.id}-${i}`}
                                  defaultOpen={
                                    toolPart.state === 'output-error'
                                  }
                                >
                                  <ToolHeader
                                    title={toolName}
                                    type={toolPart.type}
                                    state={toolPart.state}
                                  />
                                  <ToolContent>
                                    {toolPart.input != null ? (
                                      <ToolInput input={toolPart.input} />
                                    ) : null}
                                    {isToolInProgress && (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader size={20} />
                                      </div>
                                    )}
                                    <ToolOutput
                                      output={toolPart.output}
                                      errorText={toolPart.errorText}
                                    />
                                  </ToolContent>
                                </Tool>
                              );
                            }
                            return null;
                        }
                      })}
                    </div>
                  );
                })
              )}
              {status === 'submitted' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 flex items-start gap-3 duration-300">
                  <BotAvatar size={6} className="mt-1 shrink-0" />
                  <div className="flex-end flex w-full max-w-[80%] min-w-0 flex-col justify-start gap-2">
                    <Message from="assistant" className="w-full">
                      <MessageContent>
                        <div className="inline-flex items-baseline gap-0.5">
                          <MessageResponse></MessageResponse>
                          <span className="inline-block h-4 w-0.5 animate-pulse bg-current" />
                        </div>
                      </MessageContent>
                    </Message>
                  </div>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="shrink-0">
          <PromptInputInner
            sendMessage={sendMessage}
            state={state}
            setState={setState}
            textareaRef={textareaRef}
            status={status}
            stop={stop}
            setMessages={setMessages}
            messages={messages}
          />
        </div>
      </div>
    </PromptInputProvider>
  );
}

function PromptInputInner({
  sendMessage,
  state,
  setState,
  textareaRef,
  status,
  stop,
  setMessages,
  messages,
}: {
  sendMessage: ReturnType<typeof useChat>['sendMessage'];
  state: { input: string; model: string; webSearch: boolean };
  setState: React.Dispatch<
    React.SetStateAction<{ input: string; model: string; webSearch: boolean }>
  >;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  status: ReturnType<typeof useChat>['status'];
  stop: ReturnType<typeof useChat>['stop'];
  setMessages: ReturnType<typeof useChat>['setMessages'];
  messages: ReturnType<typeof useChat>['messages'];
}) {
  const attachments = usePromptInputAttachments();
  const controller = usePromptInputController();
  const [isAborting, setIsAborting] = useState(false);

  useEffect(() => {
    if (status !== 'streaming' && isAborting) {
      setTimeout(() => setIsAborting(false), 0);
    }
  }, [status, isAborting]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    controller.textInput.clear();
    setState((prev) => ({ ...prev, input: '' }));

    try {
      await sendMessage(
        {
          text: message.text || 'Sent with attachments',
          files: message.files,
        },
        {
          body: {
            model: state.model,
            webSearch: state.webSearch,
          },
        },
      );
      attachments.clear();
    } catch {
      toast.error('Failed to send message. Please try again.');
    }
  };

  return (
    <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          ref={textareaRef}
          onChange={(e) =>
            setState((prev) => ({ ...prev, input: e.target.value }))
          }
          value={state.input}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (e.key === 'Enter' && e.shiftKey) {
              return;
            }

            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              e.stopPropagation();

              if (status === 'streaming' || status === 'submitted') {
                return;
              }

              const form = e.currentTarget.form;
              const submitButton = form?.querySelector(
                'button[type="submit"]',
              ) as HTMLButtonElement | null;
              if (submitButton && !submitButton.disabled) {
                form?.requestSubmit();
              }
            }
          }}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton
            variant={state.webSearch ? 'default' : 'ghost'}
            onClick={() =>
              setState((prev) => ({ ...prev, webSearch: !prev.webSearch }))
            }
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton>
          <PromptInputSelect
            onValueChange={(value) => {
              setState((prev) => ({ ...prev, model: value }));
            }}
            value={state.model}
          >
            <PromptInputSelectTrigger>
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {models.map((model) => (
                <PromptInputSelectItem key={model.value} value={model.value}>
                  {model.name}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={
            isAborting ||
            (status !== 'streaming' &&
              !state.input.trim() &&
              attachments.files.length === 0)
          }
          status={isAborting ? undefined : status}
          type={status === 'streaming' && !isAborting ? 'button' : 'submit'}
          onClick={async (e) => {
            if (status === 'streaming' && !isAborting) {
              e.preventDefault();
              e.stopPropagation();

              setIsAborting(true);

              const lastAssistantMessage = messages
                .filter((m: UIMessage) => m.role === 'assistant')
                .at(-1);

              if (lastAssistantMessage) {
                setMessages((prev) =>
                  prev.filter((m) => m.id !== lastAssistantMessage.id),
                );
              }
              stop();
            }
          }}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
