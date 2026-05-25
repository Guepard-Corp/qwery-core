import type { ToolEvent, ToolName, ToolResult } from '@qwery/domain';

/**
 * Wraps a tool execution: emits running/done/error `ToolEvent`s (for the UI) and
 * returns the LLM-facing payload, converting thrown errors into
 * `{ ok: false, error }` so the model can recover. Shared by every tool factory.
 */
export type Track = <TLlm>(
  name: ToolName,
  input: unknown,
  fn: () => Promise<{ ui: ToolResult; llm: TLlm }>,
) => Promise<TLlm | { ok: false; error: string }>;

export function createTracker(onEvent: (event: ToolEvent) => void): Track {
  let counter = 0;
  const newId = (name: ToolName) => `${name}-${++counter}-${Math.random().toString(36).slice(2, 6)}`;

  return async (name, input, fn) => {
    const id = newId(name);
    const startedAt = Date.now();
    onEvent({ id, name, startedAt, status: 'running', input });
    try {
      const { ui, llm } = await fn();
      onEvent({ id, name, startedAt, endedAt: Date.now(), status: 'done', input, output: ui });
      return llm;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onEvent({
        id,
        name,
        startedAt,
        endedAt: Date.now(),
        status: 'error',
        input,
        output: { kind: 'error', message },
      });
      return { ok: false, error: message };
    }
  };
}
