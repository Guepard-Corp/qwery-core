import { z } from 'zod';
import { validateDatasourceUrl } from './datasource-utils';

import type {
  ConnectionFieldKind,
  DatasourceFormConfigPayload,
  FormConfigPreset,
} from '@qwery/extensions-sdk';

export type { ConnectionFieldKind, DatasourceFormConfigPayload };

export type DatasourceField =
  | 'host'
  | 'port'
  | 'database'
  | 'username'
  | 'password'
  | 'connectionString';

export interface FieldInputConfig {
  type?: 'text' | 'password' | 'number';
  inputMode?: 'text' | 'numeric' | 'url';
  autoComplete?: 'off' | 'on' | 'new-password' | 'one-time-code';
}

export interface FieldLabels {
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
}

export interface DatasourceFormPlaceholders {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  connectionString: string;
}

export interface DatasourceFormConfig {
  placeholders: DatasourceFormPlaceholders;
  inputConfig: Partial<Record<DatasourceField, FieldInputConfig>>;
  fieldLabels: FieldLabels;
  defaultHost: string | null;
  defaultPort: string | null;
  connectionFieldKind: ConnectionFieldKind;
  showDetailsTab: boolean;
  showConnectionStringTab: boolean;
  showSslToggle: boolean;
  docsUrl: string | null;
}

const DEFAULT_PLACEHOLDERS: DatasourceFormPlaceholders = {
  host: 'localhost or 192.168.1.1',
  port: '5432',
  database: 'mydb',
  username: 'Database username',
  password: 'Database password',
  connectionString: 'postgresql://user:pass@host:port/db',
};

const DEFAULT_FIELD_LABELS: FieldLabels = {
  host: 'Host',
  port: 'Port',
  database: 'Database',
  username: 'Username',
  password: 'Password',
  connectionString: 'Connection string',
};

const DEFAULT_INPUT_CONFIG: Partial<Record<DatasourceField, FieldInputConfig>> =
  {
    port: { type: 'text', inputMode: 'numeric', autoComplete: 'off' },
    password: { type: 'password', autoComplete: 'new-password' },
  };

/**
 * Schema type for provider config validation.
 * Uses minimal interface to stay compatible with Zod 3/4 internal types.
 */
type ProviderConfigSchema = {
  safeParse: (
    data: unknown,
  ) =>
    | { success: true; data: Record<string, unknown> }
    | { success: false; error: z.ZodError };
};

type ProviderRule = {
  placeholders?: Partial<DatasourceFormPlaceholders>;
  fieldLabels?: FieldLabels;
  defaultHost?: string;
  defaultPort?: string;
  connectionFieldKind?: ConnectionFieldKind;
  showDetailsTab?: boolean;
  showConnectionStringTab?: boolean;
  showSslToggle?: boolean;
  docsUrl?: string | null;
  isValid: (values: Record<string, unknown>) => boolean;
  getValidationError: (values: Record<string, unknown>) => string | null;
  normalize: (config: Record<string, unknown>) => Record<string, unknown>;
  zodSchema: ProviderConfigSchema;
};

const stringOrUndefined = z.union([z.string(), z.undefined()]);
const baseConfigSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    host: stringOrUndefined.optional(),
    port: stringOrUndefined.optional(),
    database: stringOrUndefined.optional(),
    username: stringOrUndefined.optional(),
    password: stringOrUndefined.optional(),
    connectionUrl: stringOrUndefined.optional(),
    connectionString: stringOrUndefined.optional(),
    url: stringOrUndefined.optional(),
    sharedLink: stringOrUndefined.optional(),
    jsonUrl: stringOrUndefined.optional(),
    apiKey: stringOrUndefined.optional(),
    ssl: z.boolean().optional(),
  }),
);

function normalizeDetails(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.connectionUrl) return { connectionUrl: config.connectionUrl };
  const normalized = { ...config };
  delete (normalized as Record<string, unknown>).connectionUrl;
  Object.keys(normalized).forEach((key) => {
    const v = (normalized as Record<string, unknown>)[key];
    if (key !== 'password' && (v === '' || v === undefined)) {
      delete (normalized as Record<string, unknown>)[key];
    }
  });
  return normalized;
}

const SQL_RULE: ProviderRule = {
  connectionFieldKind: 'connectionString',
  showDetailsTab: true,
  showConnectionStringTab: true,
  zodSchema: baseConfigSchema.refine(
    (c) => !!(c.connectionUrl || c.connectionString || c.host),
    { message: 'Provide a connection URL or host' },
  ),
  isValid: (v) => !!(v.connectionUrl || v.connectionString || v.host),
  getValidationError: () =>
    'Provide either a connection URL or connection details (host is required)',
  normalize: (c) =>
    c.connectionUrl ? { connectionUrl: c.connectionUrl } : normalizeDetails(c),
};

const API_KEY_RULE: ProviderRule = {
  connectionFieldKind: 'apiKey',
  showDetailsTab: false,
  showConnectionStringTab: true,
  zodSchema: baseConfigSchema.refine(
    (c) =>
      !!(
        (c as Record<string, unknown>).apiKey ||
        (c as Record<string, unknown>).connectionUrl ||
        (c as Record<string, unknown>).connectionString
      ),
    { message: 'Provide your API key' },
  ),
  isValid: (v) => !!(v.apiKey || v.connectionUrl || v.connectionString),
  getValidationError: () => 'Provide your API key',
  normalize: (c) => ({
    apiKey: (c.apiKey || c.connectionUrl || c.connectionString) as string,
  }),
};

const EMBEDDABLE_RULE: ProviderRule = {
  connectionFieldKind: 'connectionString',
  showDetailsTab: false,
  showConnectionStringTab: true,
  zodSchema: baseConfigSchema,
  isValid: () => true,
  getValidationError: () => null,
  normalize: (c) => (c.database ? { database: c.database } : {}),
};

function credentialRule(
  normalizedKey: string,
  acceptedKeys: string[],
  message: string,
): ProviderRule {
  return {
    showDetailsTab: false,
    showConnectionStringTab: true,
    zodSchema: baseConfigSchema.refine(
      (c) => acceptedKeys.some((k) => !!(c as Record<string, unknown>)[k]),
      { message },
    ),
    isValid: (v) =>
      acceptedKeys.some((k) => !!(v as Record<string, unknown>)[k]),
    getValidationError: () => message,
    normalize: (c) => {
      const val = acceptedKeys.reduce<unknown>(
        (acc, k) => acc ?? (c as Record<string, unknown>)[k],
        undefined,
      );
      return { [normalizedKey]: val } as Record<string, unknown>;
    },
  };
}

function presetRule(
  preset: FormConfigPreset,
  formConfig?: DatasourceFormConfigPayload | null,
): ProviderRule {
  switch (preset) {
    case 'sql':
      return SQL_RULE;
    case 'apiKey':
      return API_KEY_RULE;
    case 'embeddable':
      return EMBEDDABLE_RULE;
    case 'fileUrl':
    case 'sharedLink': {
      const key =
        formConfig?.normalizedKey ??
        (preset === 'sharedLink' ? 'sharedLink' : 'url');
      const keys =
        formConfig?.acceptedKeys ??
        (preset === 'sharedLink'
          ? ['sharedLink', 'url']
          : ['url', 'connectionUrl']);
      const msg =
        preset === 'sharedLink'
          ? 'Provide a shared link'
          : 'Provide a file URL';
      return credentialRule(key, keys, msg);
    }
    default:
      return SQL_RULE;
  }
}

const DEFAULT_RULE: ProviderRule = {
  ...SQL_RULE,
  docsUrl: null,
};

const LEGACY_RULES: Record<string, ProviderRule> = {
  postgresql: {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://www.postgresql.org/docs/current/libpq-connect.html',
  },
  'postgresql-neon': {
    ...SQL_RULE,
    defaultHost: 'ep-xxx.region.aws.neon.tech',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://neon.tech/docs/connect/connect-intro',
  },
  'postgresql-supabase': {
    ...SQL_RULE,
    defaultHost: 'db.xxx.supabase.co',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
  },
  mysql: {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '3306',
    showSslToggle: true,
    docsUrl:
      'https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-reference-jdbc-url-format.html',
  },
  'clickhouse-node': {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '8123',
    showSslToggle: true,
    docsUrl: 'https://clickhouse.com/docs/en/interfaces/http',
  },
  'clickhouse-web': {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '8123',
    showSslToggle: true,
    docsUrl: 'https://clickhouse.com/docs/en/interfaces/http',
  },
  duckdb: {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://duckdb.org/docs/connectivity/overview',
  },
  'duckdb-wasm': {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://duckdb.org/docs/connectivity/overview',
  },
  pglite: {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://github.com/electric-sql/pglite',
  },
  'gsheet-csv': {
    ...credentialRule(
      'sharedLink',
      ['sharedLink', 'url'],
      'Provide a Google Sheets shared link',
    ),
    connectionFieldKind: 'sharedLink',
    docsUrl: 'https://support.google.com/docs/answer/2494822',
    zodSchema: baseConfigSchema.refine(
      (c) => {
        const url = (c.sharedLink || c.url) as string | undefined;
        if (!url) return false;
        const { isValid } = validateDatasourceUrl('gsheet-csv', url);
        return isValid;
      },
      { message: 'Provide a valid Google Sheets shared link' },
    ),
  },
  'json-online': {
    ...credentialRule(
      'jsonUrl',
      ['jsonUrl', 'url', 'connectionUrl'],
      'Provide a JSON file URL',
    ),
    connectionFieldKind: 'fileUrl',
    zodSchema: baseConfigSchema
      .refine(
        (c) => {
          const url =
            c.jsonUrl || c.url || c.connectionUrl || c.connectionString;
          return !!url;
        },
        { message: 'Provide a JSON file URL' },
      )
      .refine(
        (c) => {
          const url = (c.jsonUrl ||
            c.url ||
            c.connectionUrl ||
            c.connectionString) as string | undefined;
          const { isValid } = validateDatasourceUrl('json-online', url);
          return isValid;
        },
        {
          message:
            'Please enter a valid URL (must start with http:// or https://)',
        },
      ),
  },
  'parquet-online': {
    ...credentialRule(
      'url',
      ['url', 'connectionUrl'],
      'Provide a Parquet file URL',
    ),
    connectionFieldKind: 'fileUrl',
  },
  'youtube-data-api-v3': {
    ...API_KEY_RULE,
    docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
  },
};

function resolveRule(
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
): ProviderRule {
  if (formConfig?.preset) {
    const rule = presetRule(formConfig.preset, formConfig);
    return {
      ...rule,
      docsUrl: formConfig.docsUrl ?? rule.docsUrl,
      defaultHost: formConfig.defaultHost ?? rule.defaultHost,
      defaultPort: formConfig.defaultPort ?? rule.defaultPort,
      connectionFieldKind:
        formConfig.connectionFieldKind ?? rule.connectionFieldKind,
      showDetailsTab: formConfig.showDetailsTab ?? rule.showDetailsTab,
      showConnectionStringTab:
        formConfig.showConnectionStringTab ?? rule.showConnectionStringTab,
      showSslToggle: formConfig.showSslToggle ?? rule.showSslToggle ?? false,
      placeholders: formConfig.placeholders
        ? { ...DEFAULT_PLACEHOLDERS, ...formConfig.placeholders }
        : rule.placeholders,
      fieldLabels: formConfig.fieldLabels
        ? { ...DEFAULT_FIELD_LABELS, ...formConfig.fieldLabels }
        : rule.fieldLabels,
    };
  }
  return LEGACY_RULES[provider] ?? DEFAULT_RULE;
}

export function getDatasourceFormConfig(
  extensionId: string,
  formConfig?: DatasourceFormConfigPayload | null,
): DatasourceFormConfig {
  const rule = resolveRule(extensionId, formConfig);
  return {
    placeholders: { ...DEFAULT_PLACEHOLDERS, ...rule.placeholders },
    inputConfig: { ...DEFAULT_INPUT_CONFIG },
    fieldLabels: { ...DEFAULT_FIELD_LABELS, ...rule.fieldLabels },
    defaultHost: rule.defaultHost ?? null,
    defaultPort: rule.defaultPort ?? null,
    connectionFieldKind: rule.connectionFieldKind ?? 'connectionString',
    showDetailsTab: rule.showDetailsTab ?? true,
    showConnectionStringTab: rule.showConnectionStringTab ?? true,
    showSslToggle: rule.showSslToggle ?? false,
    docsUrl: rule.docsUrl ?? null,
  };
}

export function getDocsUrl(
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
): string | null {
  if (formConfig?.docsUrl) return formConfig.docsUrl;
  return resolveRule(provider, null).docsUrl ?? null;
}

export function validateProviderConfig(
  config: Record<string, unknown>,
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
): string | null {
  if (!provider) return 'Extension provider not found';
  const rule = resolveRule(provider, formConfig);
  if (rule.isValid(config)) return null;
  return rule.getValidationError(config);
}

export function validateProviderConfigWithZod(
  config: Record<string, unknown>,
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string } {
  const rule = resolveRule(provider, formConfig);
  const parsed = rule.zodSchema.safeParse(config);
  if (parsed.success)
    return { success: true, data: parsed.data as Record<string, unknown> };
  const msg = parsed.error.issues[0]?.message ?? 'Invalid configuration';
  return { success: false, error: msg };
}

export function normalizeProviderConfig(
  config: Record<string, unknown>,
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
): Record<string, unknown> {
  if (!provider) return config;
  return resolveRule(provider, formConfig).normalize(config);
}

export function isFormValidForProvider(
  values: Record<string, unknown>,
  provider: string,
  formConfig?: DatasourceFormConfigPayload | null,
): boolean {
  if (!provider) return false;
  return resolveRule(provider, formConfig).isValid(values);
}

export function getProviderZodSchema(
  extensionId: string,
  formConfig?: DatasourceFormConfigPayload | null,
): ProviderConfigSchema {
  return resolveRule(extensionId, formConfig).zodSchema;
}
