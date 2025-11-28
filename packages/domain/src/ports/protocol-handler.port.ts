import type {
  ProtocolEnvelope,
  TypedProtocolEnvelope,
} from '../protocol/index';
import { ProtocolEnvelopeKind } from '../protocol/index';

/**
 * Abstract protocol handler for processing protocol envelopes.
 *
 * This class provides a type-safe way to handle different types of protocol
 * messages. Subclasses must implement handler methods for each envelope kind.
 *
 * The main `handle` method routes envelopes to the appropriate handler based
 * on the envelope kind, ensuring type safety through discriminated unions.
 *
 * @example
 * ```ts
 * class MyProtocolHandler extends ProtocolHandlerPort {
 *   async handleHandshake(envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Handshake>) {
 *     // Handle handshake
 *   }
 *   // ... implement other handlers
 * }
 * ```
 */
export abstract class IProtocolHandler {
  /**
   * Main entry point for handling protocol envelopes.
   *
   * Routes the envelope to the appropriate handler method based on its kind.
   *
   * @param envelope - The protocol envelope to handle
   * @returns Promise that resolves when handling is complete
   */
  async handle(envelope: ProtocolEnvelope): Promise<void> {
    switch (envelope.kind) {
      case ProtocolEnvelopeKind.Heartbeat:
        return this.handleHeartbeat(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Heartbeat>,
        );

      case ProtocolEnvelopeKind.Handshake:
        return this.handleHandshake(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Handshake>,
        );

      case ProtocolEnvelopeKind.Error:
        return this.handleError(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Error>,
        );

      case ProtocolEnvelopeKind.Message:
        return this.handleMessage(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Message>,
        );

      case ProtocolEnvelopeKind.Tool:
        return this.handleTool(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Tool>,
        );

      case ProtocolEnvelopeKind.Usage:
        return this.handleUsage(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Usage>,
        );

      case ProtocolEnvelopeKind.Command:
        return this.handleCommand(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Command>,
        );

      case ProtocolEnvelopeKind.Chunk:
        return this.handleChunk(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Chunk>,
        );

      case ProtocolEnvelopeKind.Reasoning:
        return this.handleReasoning(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Reasoning>,
        );

      case ProtocolEnvelopeKind.Status:
        return this.handleStatus(
          envelope as TypedProtocolEnvelope<ProtocolEnvelopeKind.Status>,
        );

      default: {
        // Exhaustiveness check - TypeScript will error if a new kind is added
        const _exhaustive: never = envelope.kind;
        throw new Error(`Unknown protocol envelope kind: ${_exhaustive}`);
      }
    }
  }

  /**
   * Handle heartbeat envelopes.
   *
   * Heartbeats are used to maintain connection and detect disconnections.
   */
  abstract handleHeartbeat(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Heartbeat>,
  ): Promise<void>;

  /**
   * Handle handshake envelopes.
   *
   * Handshakes establish the connection and identify project/conversation context.
   */
  abstract handleHandshake(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Handshake>,
  ): Promise<void>;

  /**
   * Handle error envelopes.
   *
   * Errors communicate protocol-level or processing errors.
   */
  abstract handleError(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Error>,
  ): Promise<void>;

  /**
   * Handle message envelopes.
   *
   * Messages contain text content from users, assistants, or system.
   */
  abstract handleMessage(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Message>,
  ): Promise<void>;

  /**
   * Handle tool envelopes.
   *
   * Tool envelopes contain tool call requests from agents.
   */
  abstract handleTool(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Tool>,
  ): Promise<void>;

  /**
   * Handle usage envelopes.
   *
   * Usage envelopes contain token usage and execution metrics.
   */
  abstract handleUsage(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Usage>,
  ): Promise<void>;

  /**
   * Handle command envelopes.
   *
   * Commands allow clients to control agent settings and query state.
   */
  abstract handleCommand(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Command>,
  ): Promise<void>;

  /**
   * Handle chunk envelopes.
   *
   * Chunks contain partial message content for streaming responses.
   */
  abstract handleChunk(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Chunk>,
  ): Promise<void>;

  /**
   * Handle reasoning envelopes.
   *
   * Reasoning envelopes contain intermediate thinking steps from agents.
   */
  abstract handleReasoning(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Reasoning>,
  ): Promise<void>;

  /**
   * Handle status envelopes.
   *
   * Status envelopes communicate agent or system state updates.
   */
  abstract handleStatus(
    envelope: TypedProtocolEnvelope<ProtocolEnvelopeKind.Status>,
  ): Promise<void>;
}
