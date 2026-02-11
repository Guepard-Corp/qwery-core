/**
 * Returns the last index in parts that is a todo part (tool-todowrite or tool-todoread),
 * or null if none. Used to render a single TodoPart per message (the latest state).
 */
export function getLastTodoPartIndex(
  parts: Array<{ type: string }>,
): number | null {
  let last: number | null = null;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (
      part &&
      (part.type === 'tool-todowrite' || part.type === 'tool-todoread')
    ) {
      last = i;
    }
  }
  return last;
}
