/**
 * Builds a system-reminder text for attached datasources.
 * Used by the generic insertReminders flow; oriented toward the query agent.
 * Only takes the list of names/ids (no full orchestration result).
 */
export function buildDatasourceReminder(
  attachedDatasourceNames: string[],
): string {
  const wrapped = (content: string) =>
    `<system-reminder>\n${content}\n</system-reminder>`;

  if (attachedDatasourceNames.length > 0) {
    const list = attachedDatasourceNames.join(', ');
    return wrapped(
      `The following datasources are currently attached to this conversation: ${list}. Use getSchema for compact table discovery. When crafting performance-sensitive SQL (large joins, selective filters, ORDER BY/GROUP BY tuning), call getSchemaDetailed to inspect indexes/keys/constraints before finalizing the query. Then use runQuery to execute.`,
    );
  }

  return wrapped(
    'No datasources are currently attached. If the user asks about data, direct them to attach a datasource first.',
  );
}
