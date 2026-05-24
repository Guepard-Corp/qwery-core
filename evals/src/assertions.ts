import type { ToolEvent } from '@qwery/domain';

/** Rows returned by every completed `runQuery` in the trace (the privacy-safe scalar path). */
export function runQueryRows(trace: ToolEvent[]): Array<Record<string, unknown>> {
  return trace
    .filter((e) => e.name === 'runQuery' && e.status === 'done' && e.output?.kind === 'runQuery')
    .map((e) => (e.output as { kind: 'runQuery'; row: Record<string, unknown> }).row);
}

/** True if any tool with `name` ran to completion. */
export function usedTool(trace: ToolEvent[], name: ToolEvent['name']): boolean {
  return trace.some((e) => e.name === name && e.status === 'done');
}

/** True if any runQuery scalar equals the expected number. */
export function runQueryHit(trace: ToolEvent[], expected: number): boolean {
  return runQueryRows(trace).some((row) => Object.values(row).some((v) => Number(v) === expected));
}
