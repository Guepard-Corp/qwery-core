/**
 * Builds a system-reminder text for attached datasources.
 * Used by the generic insertReminders flow; oriented toward the query agent.
 * Only takes the list of names/ids (no full orchestration result).
 */
export function buildDatasourceReminder(
  attachedDatasources: Array<{
    id: string;
    name: string;
    provider: string;
    driver: string;
  }>,
): string {
  const wrapped = (content: string) =>
    `<system-reminder>\n${content}\n</system-reminder>`;

  if (attachedDatasources.length > 0) {
    const list = attachedDatasources
      .map((d) => `${d.name} (datasourceId: ${d.id}, provider: ${d.provider})`)
      .join(', ');

    const rules = attachedDatasources
      .map((d) => formatSqlDialectReminder(d.provider))
      .filter((x) => x !== null);

    return wrapped(
      `The following datasources are currently attached to this conversation: ${list}. ` +
        `Use getSchema with detailLevel "simple" to discover tables and columns with low token usage. ` +
        `Use detailLevel "full" only when needed, then runQuery to query.` +
        (rules.length > 0
          ? `\n\nSQL DIALECT RULES (identifier quoting):\n${rules.join('\n')}`
          : ''),
    );
  }

  return wrapped(
    'No datasources are currently attached. If the user asks about data, direct them to attach a datasource first.',
  );
}

function formatSqlDialectReminder(provider: string): string | null {
  const p = provider.toLowerCase();

  // PostgreSQL-family
  if (
    p === 'postgresql' ||
    p === 'postgresql-supabase' ||
    p === 'postgresql-neon' ||
    p === 'pglite'
  ) {
    return `- ${provider}: identifiers use \\"\\", strings use ' (unquoted identifiers fold to lowercase)`;
  }

  // MySQL
  if (p === 'mysql') {
    return `- ${provider}: identifiers use \`\\\`identifier\\\`\\\`, strings use '`;
  }

  // DuckDB-family
  if (
    p === 'duckdb' ||
    p === 'duckdb-wasm' ||
    // These providers query via DuckDB under the hood.
    p === 'csv-online' ||
    p === 'gsheet-csv' ||
    p === 'json-online' ||
    p === 'parquet-online' ||
    p === 's3' ||
    p === 'youtube-data-api-v3'
  ) {
    return `- ${provider}: identifiers use \\"\\", strings use ' (unquoted identifiers fold to lowercase)`;
  }

  // ClickHouse-family (prefer backticks for safety)
  if (p === 'clickhouse-node' || p === 'clickhouse-web') {
    return `- ${provider}: identifiers prefer \`\\\`identifier\\\`\\\`, strings use '`;
  }

  return null;
}
