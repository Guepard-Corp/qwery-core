/**
 * Protocol definitions for agent-client communication.
 *
 * This module defines the type-safe protocol for exchanging messages between
 * clients (UI) and agents (backend) over WebSocket or similar transport.
 *
 * The protocol uses discriminated unions to ensure type safety between envelope
 * kinds and their corresponding payload types.
 */

/**
 * Envelope kind discriminator for protocol messages.
 */
export enum ProtocolEnvelopeKind {
  Handshake = 'Handshake',
  Message = 'Message',
  Chunk = 'Chunk',
  Reasoning = 'Reasoning',
  Tool = 'Tool',
  Status = 'Status',
  Heartbeat = 'Heartbeat',
  Command = 'Command',
  Error = 'Error',
  Usage = 'Usage',
}

/**
 * Base protocol envelope structure wrapping all message exchanges.
 *
 * Each envelope contains metadata (id, kind, routing) and a type-safe payload
 * that corresponds to the envelope kind.
 */
export interface ProtocolEnvelope {
  /** Unique identifier for this envelope. */
  id: string;

  /** Discriminator determining the payload type. */
  kind: ProtocolEnvelopeKind;

  /** Type-safe payload corresponding to the envelope kind. */
  payload: ProtocolPayload;

  /** Source identifier (client or agent ID). */
  from: string;

  /** Destination identifier (client or agent ID). */
  to: string;
}

/**
 * Discriminated union of all possible protocol payloads.
 *
 * Each payload type is associated with a specific ProtocolEnvelopeKind to ensure
 * type safety when constructing or parsing envelopes.
 */
export type ProtocolPayload =
  | HeartbeatPayload
  | HandshakePayload
  | ErrorPayload
  | MessagePayload
  | ToolPayload
  | UsagePayload
  | CommandPayload
  | ChunkPayload
  | ReasoningPayload
  | StatusPayload;

// ============================================================================
// Payload Types
// ============================================================================

/**
 * Heartbeat payload for connection keep-alive.
 *
 * Used to maintain WebSocket connections and detect disconnections.
 */
export interface HeartbeatPayload {
  kind: ProtocolEnvelopeKind.Heartbeat;
}

/**
 * Client handshake request payload.
 *
 * Sent by clients to establish a connection and identify the project/conversation
 * context for the session.
 */
export interface HandshakePayload {
  kind: ProtocolEnvelopeKind.Handshake;
  /** Unique identifier for the project. */
  projectId: string;
  /** Unique identifier for the conversation session. */
  conversationId: string;
}

/**
 * Error payload for protocol-level errors.
 *
 * Used to communicate errors that occur during message processing or transport.
 */
export interface ErrorPayload {
  kind: ProtocolEnvelopeKind.Error;
  /** Machine-readable error code for programmatic handling. */
  errorCode: string;
  /** Human-readable error message. */
  message: string;
  /** Optional additional error context. */
  data?: Record<string, unknown>;
  /** Unique identifier for this error instance. */
  uuid: string;
}

/**
 * Message role discriminator for chat messages.
 */
export enum MessageRole {
  User = 'user',
  System = 'system',
  Assistant = 'assistant',
  Developer = 'developer',
}

/**
 * Message payload for text content exchange.
 *
 * Represents user messages, assistant responses, system prompts, or developer
 * annotations in the conversation.
 */
export interface MessagePayload {
  kind: ProtocolEnvelopeKind.Message;
  /** Role of the message sender. */
  role: MessageRole;
  /** Type discriminator for message content format. */
  message_type: string;
  /** Text content of the message. */
  content: string;
}

/**
 * Tool call structure representing a single tool invocation.
 */
export interface ToolCall {
  /** Unique identifier for this tool call. */
  id: string;
  /** Call identifier for tracking tool execution. */
  call_id: string;
  /** Name of the tool being called. */
  name: string;
  /** Arguments passed to the tool as a JSON object. */
  arguments: Record<string, unknown>;
}

/**
 * Tool payload for tool call messages.
 *
 * Sent when an agent requests to execute one or more tools.
 */
export interface ToolPayload {
  kind: ProtocolEnvelopeKind.Tool;
  /** Array of tool calls to execute. */
  tool_calls: ToolCall[];
  /** Optional reasoning or explanation for the tool calls. */
  reasoning?: string;
}

/**
 * Chunk payload for streaming message content.
 *
 * Used to send partial message content as it's being generated.
 */
export interface ChunkPayload {
  kind: ProtocolEnvelopeKind.Chunk;
  /** Partial content chunk. */
  content: string;
  /** Optional chunk index for ordering. */
  index?: number;
}

/**
 * Reasoning payload for agent thinking/reasoning steps.
 *
 * Contains intermediate reasoning steps that the agent is processing.
 */
export interface ReasoningPayload {
  kind: ProtocolEnvelopeKind.Reasoning;
  /** Reasoning content or thinking process. */
  content: string;
  /** Optional step identifier. */
  step?: string;
}

/**
 * Status payload for agent or system status updates.
 *
 * Communicates the current state of the agent or system.
 */
export interface StatusPayload {
  kind: ProtocolEnvelopeKind.Status;
  /** Status message or state description. */
  status: string;
  /** Optional status code. */
  code?: string;
  /** Optional additional status metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Finish reason for message completion.
 */
export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | 'error';

/**
 * Usage statistics payload.
 *
 * Tracks token usage, execution time, and other metrics for agent responses.
 */
export interface UsagePayload {
  kind: ProtocolEnvelopeKind.Usage;
  /** Reason why the response finished. */
  finish_reason: FinishReason;
  /** Execution time in milliseconds. */
  execution_time_ms: number;
  /** Original query that generated this response. */
  query: string;
  /** Length of the response in characters. */
  response_length: number;
  /** Unix timestamp when the response was generated. */
  timestamp: number;
  /** Whether tool calls were detected in this response. */
  tool_calls_detected: boolean;
  /** Number of input tokens consumed. */
  input_tokens: number;
  /** Number of output tokens generated. */
  output_tokens: number;
  /** Total tokens (input + output). */
  total_tokens: number;
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * Command type discriminator for agent control commands.
 */
export enum CommandType {
  Set = 'Set',
  Get = 'Get',
  List = 'List',
  Status = 'Status',
}

/**
 * Set command argument key types.
 */
export enum SetCommandArgumentType {
  Role = 'Role',
  Model = 'Model',
  Database = 'Database',
}

/**
 * Get command argument key types.
 */
export enum GetCommandArgumentType {
  Role = 'Role',
  Model = 'Model',
  Database = 'Database',
}

/**
 * Set command argument structure.
 */
export interface SetCommandArgument {
  /** The configuration key to set. */
  key: SetCommandArgumentType;
  /** The value to assign. */
  value: string;
}

/**
 * Get command argument structure.
 */
export interface GetCommandArgument {
  /** The configuration key to retrieve. */
  key: GetCommandArgumentType;
}

/**
 * List command argument structure.
 */
export interface ListCommandArgument {
  /** Optional filter for listing specific resource types. */
  resourceType?: string;
}

/**
 * Status command argument structure.
 */
export interface StatusCommandArgument {
  /** Optional component identifier for status check. */
  component?: string;
}

/**
 * Discriminated union of command arguments based on command type.
 *
 * Uses a tagged union pattern where each variant is keyed by the command type.
 */
export type CommandArgument =
  | { SetCommandArgument: SetCommandArgument }
  | { GetCommandArgument: GetCommandArgument }
  | { ListCommandArgument?: ListCommandArgument }
  | { StatusCommandArgument?: StatusCommandArgument };

/**
 * Command payload for agent control operations.
 *
 * Allows clients to configure agent settings, retrieve state, or query status.
 */
export interface CommandPayload {
  kind: ProtocolEnvelopeKind.Command;
  /** Type of command to execute. */
  command: CommandType;
  /** Type-safe command arguments. */
  arguments: CommandArgument;
}

// ============================================================================
// Client-Side Types
// ============================================================================

/**
 * Chat message structure for UI display.
 *
 * Simplified message format optimized for rendering in chat interfaces.
 */
export interface ChatMessage {
  /** Optional unique identifier for the message. */
  id?: string;
  /** Role of the message sender. */
  role: 'user' | 'assistant';
  /** Text content of the message. */
  content: string;
  /** Optional thinking/reasoning content (for assistant messages). */
  thinking_content?: string;
  /** Optional array of image URLs or base64 data. */
  images?: string[];
  /** Optional timestamp for message ordering. */
  timestamp?: number;
}

/**
 * Project context information.
 *
 * Contains metadata about the project and conversation session.
 */
export interface ProjectContext {
  /** Unique identifier for the project. */
  projectId: string;
  /** Unique identifier for the conversation session. */
  conversationId: string;
  /** Human-readable project name. */
  projectName: string;
}

// ============================================================================
// Type-Safe Helper Types
// ============================================================================

/**
 * Type mapping from envelope kind to its corresponding payload type.
 *
 * This enables type-safe envelope construction and payload extraction.
 */
export type PayloadByKind = {
  [ProtocolEnvelopeKind.Heartbeat]: HeartbeatPayload;
  [ProtocolEnvelopeKind.Handshake]: HandshakePayload;
  [ProtocolEnvelopeKind.Error]: ErrorPayload;
  [ProtocolEnvelopeKind.Message]: MessagePayload;
  [ProtocolEnvelopeKind.Tool]: ToolPayload;
  [ProtocolEnvelopeKind.Usage]: UsagePayload;
  [ProtocolEnvelopeKind.Command]: CommandPayload;
  [ProtocolEnvelopeKind.Chunk]: ChunkPayload;
  [ProtocolEnvelopeKind.Reasoning]: ReasoningPayload;
  [ProtocolEnvelopeKind.Status]: StatusPayload;
};

/**
 * Type-safe envelope constructor helper.
 *
 * Creates an envelope with a payload that matches the specified kind.
 *
 * @example
 * ```ts
 * const envelope = createEnvelope(
 *   ProtocolEnvelopeKind.Message,
 *   { kind: ProtocolEnvelopeKind.Message, role: MessageRole.User, message_type: 'text', content: 'Hello' },
 *   'client-1',
 *   'agent-1'
 * );
 * ```
 */
export type TypedProtocolEnvelope<K extends keyof PayloadByKind> = Omit<
  ProtocolEnvelope,
  'kind' | 'payload'
> & {
  kind: K;
  payload: PayloadByKind[K];
};

/**
 * Type guard to check if a payload matches a specific envelope kind.
 *
 * @example
 * ```ts
 * if (isPayloadOfKind(payload, ProtocolEnvelopeKind.Message)) {
 *   // payload is now typed as MessagePayload
 *   console.log(payload.content);
 * }
 * ```
 */
export function isPayloadOfKind<K extends keyof PayloadByKind>(
  payload: ProtocolPayload,
  kind: K,
): payload is PayloadByKind[K] {
  return payload.kind === kind;
}

/**
 * Type guard to check if an envelope matches a specific kind.
 *
 * @example
 * ```ts
 * if (isEnvelopeOfKind(envelope, ProtocolEnvelopeKind.Message)) {
 *   // envelope.payload is now typed as MessagePayload
 *   console.log(envelope.payload.content);
 * }
 * ```
 */
export function isEnvelopeOfKind<K extends keyof PayloadByKind>(
  envelope: ProtocolEnvelope,
  kind: K,
): envelope is TypedProtocolEnvelope<K> {
  return envelope.kind === kind && envelope.payload.kind === kind;
}
