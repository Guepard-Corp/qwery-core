export type Message = TextMessage;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface TextMessage {
  id: string;
  conversationId: string;
  type: 'text';
  role: MessageRole;
  content: string | Array<TextContent>;
  // Anthropic:
  // stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  // OpenAI:
  // finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call' | null;
  stop_reason?: 'tool' | 'stop';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
