import type { QueryResult, ToolEvent } from '@qwery/domain';

export type ChatEntry =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'tool'; event: ToolEvent }
  | { kind: 'rendered'; text: string; result: QueryResult }
  // Output of a user-issued `!` shell command. Local-only: never persisted to
  // the message store and never added to the LLM session.
  | { kind: 'shell'; command: string; output: string; exitCode: number };
