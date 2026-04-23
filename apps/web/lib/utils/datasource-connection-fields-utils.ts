import type { DatasourceFormConfigPayload } from '~/lib/utils/datasource-form-config';
import {
  getDatasourceFormConfig,
  hasLegacyFormRule,
} from '~/lib/utils/datasource-form-config';
import { isGsheetLikeUrl } from '~/lib/utils/datasource-utils';

const EMBEDDABLE_EXTENSION_IDS = new Set(['duckdb', 'duckdb-wasm', 'pglite']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function pickFirstNonEmptyString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = record[k];
    if (isNonEmptyString(v)) return v;
  }
  return undefined;
}

/** Maps primary form field name → accepted stored keys (first match wins). */
function primaryConnectionAliases(primary: string): string[] | undefined {
  const map: Record<string, string[]> = {
    connectionUrl: ['connectionString', 'connectionUrl'],
    jsonUrl: ['jsonUrl', 'url', 'connectionUrl', 'connectionString'],
    url: ['url', 'connectionUrl', 'connectionString'],
    sharedLink: ['sharedLink', 'url'],
    apiKey: ['apiKey', 'connectionUrl', 'connectionString'],
    database: ['database', 'connectionUrl', 'connectionString'],
  };
  return map[primary];
}

export function getConnectionValueKey(
  connectionFieldKind: string,
  formConfig?: DatasourceFormConfigPayload | null,
  extensionId?: string,
): string {
  if (formConfig?.preset === 'embeddable') return 'database';
  if (extensionId && EMBEDDABLE_EXTENSION_IDS.has(extensionId)) {
    return 'database';
  }
  switch (connectionFieldKind) {
    case 'apiKey':
      return 'apiKey';
    case 'sharedLink':
      return 'sharedLink';
    case 'fileUrl':
      if (formConfig?.normalizedKey) return formConfig.normalizedKey;
      if (extensionId === 'json-online') return 'jsonUrl';
      return 'url';
    default:
      return 'connectionUrl';
  }
}

/**
 * Merges persisted config into the shape the legacy connection form expects:
 * same canonical field names as {@link getConnectionValueKey} (e.g. `connectionString` → `connectionUrl`,
 * `url` → `jsonUrl` for json-online, `connectionUrl` → `database` for DuckDB/PGlite).
 * For non-legacy {@link FormRenderer} forms, applies common URL/key aliases only.
 */
export function expandStoredConfigForFormDefaults(
  extensionId: string,
  stored: Record<string, unknown> | undefined | null,
  formConfig?: DatasourceFormConfigPayload | null,
): Record<string, unknown> {
  if (!stored || typeof stored !== 'object') return {};

  const out: Record<string, unknown> = { ...stored };

  if (hasLegacyFormRule(extensionId)) {
    // Harden gsheet-csv edit defaults: never surface non-sheet strings as shared links.
    // If we can recover a valid sheets link from `url`, use it; otherwise blank it.
    if (extensionId === 'gsheet-csv') {
      const rawShared = out.sharedLink;
      const rawUrl = out.url;
      const sharedIsSheet =
        typeof rawShared === 'string' && isGsheetLikeUrl(rawShared);
      const urlIsSheet = typeof rawUrl === 'string' && isGsheetLikeUrl(rawUrl);
      if (!sharedIsSheet) {
        if (urlIsSheet) out.sharedLink = rawUrl;
        else if (typeof rawShared === 'string' && rawShared.trim() !== '') {
          out.sharedLink = '';
        }
      }
    }

    const cfg = getDatasourceFormConfig(extensionId, formConfig ?? undefined);
    const primary = getConnectionValueKey(
      cfg.connectionFieldKind,
      formConfig,
      extensionId,
    );
    const order = primaryConnectionAliases(primary);
    if (order) {
      const cur = out[primary];
      const empty =
        cur === undefined ||
        cur === '' ||
        (typeof cur === 'string' && cur.trim() === '');
      if (empty) {
        const picked =
          extensionId === 'gsheet-csv' && primary === 'sharedLink'
            ? pickFirstNonEmptyString(
                out,
                order.filter((k) => {
                  const v = out[k];
                  return typeof v === 'string' && isGsheetLikeUrl(v);
                }),
              )
            : pickFirstNonEmptyString(out, order);
        if (picked !== undefined) out[primary] = picked;
      }
    }
    return out;
  }

  if (
    !isNonEmptyString(out.connectionUrl) &&
    isNonEmptyString(out.connectionString)
  ) {
    out.connectionUrl = out.connectionString;
  }
  if (!isNonEmptyString(out.url) && isNonEmptyString(out.jsonUrl)) {
    out.url = out.jsonUrl;
  }
  if (!isNonEmptyString(out.jsonUrl) && isNonEmptyString(out.url)) {
    out.jsonUrl = out.url;
  }
  if (!isNonEmptyString(out.sharedLink) && isNonEmptyString(out.url)) {
    out.sharedLink = out.url;
  }
  return out;
}

const DEFAULT_KEYS = [
  'host',
  'port',
  'database',
  'username',
  'password',
  'connectionUrl',
  'sharedLink',
  'apiKey',
  'url',
  'jsonUrl',
] as const;

export function getDefaultConnectionValues(): Record<string, string> {
  return Object.fromEntries(DEFAULT_KEYS.map((k) => [k, '']));
}

export function asSubmitRecord(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined && v !== ''),
  );
}

export function canonicalConfigKeyForDirtyCheck(
  extensionId: string,
  values: Record<string, unknown> | null | undefined,
): string {
  const expanded = expandStoredConfigForFormDefaults(
    extensionId,
    (values ?? {}) as Record<string, unknown>,
    undefined,
  );
  if (
    typeof expanded.jsonUrl === 'string' &&
    typeof expanded.url === 'string' &&
    expanded.jsonUrl === expanded.url
  ) {
    delete expanded.url;
  }
  if (
    typeof expanded.sharedLink === 'string' &&
    typeof expanded.url === 'string' &&
    expanded.sharedLink === expanded.url
  ) {
    delete expanded.url;
  }
  if (
    typeof expanded.connectionUrl === 'string' &&
    typeof expanded.connectionString === 'string' &&
    expanded.connectionUrl === expanded.connectionString
  ) {
    delete expanded.connectionString;
  }
  const submit = asSubmitRecord(expanded);
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(submit).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

export const DETAILS_KEYS = [
  'host',
  'port',
  'database',
  'schema',
  'username',
  'password',
] as const;
