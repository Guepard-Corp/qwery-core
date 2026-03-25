import { z } from 'zod';
import { DATASOURCE_INPUT_MAX_LENGTH } from '@qwery/extensions-sdk';
import {
  validateDatasourceUrl,
  isDataFileUrl,
  isGsheetLikeUrl,
} from './datasource-utils';
import type { DatasourceExtensionMeta } from './datasource-utils';

export { DATASOURCE_INPUT_MAX_LENGTH };

const CONNECTION_STRING_REGEX = /^(postgresql|postgres|mysql):\/\/.+/i;
const HTTP_URL_REGEX = /^https?:\/\/.+/i;

function isValidConnectionString(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return (
    CONNECTION_STRING_REGEX.test(t) || (HTTP_URL_REGEX.test(t) && t.length > 10)
  );
}

function isValidHttpUrl(s: string): boolean {
  try {
    const parsed = new URL(s.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidHost(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.toLowerCase() === 'localhost') return true;
  const ipv4 =
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(t) &&
    t.split('.').every((n) => parseInt(n, 10) <= 255);
  if (ipv4) return true;
  const hostname =
    /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(t) ||
    /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(
      t,
    );
  return hostname;
}

export type ConnectionFieldKind =
  | 'connectionString'
  | 'apiKey'
  | 'sharedLink'
  | 'fileUrl';

export type FormConfigPreset =
  | 'sql'
  | 'apiKey'
  | 'embeddable'
  | 'fileUrl'
  | 'sharedLink';

export interface DatasourceFormConfigPayload {
  preset?: FormConfigPreset;
  docsUrl?: string | null;
  defaultHost?: string;
  defaultPort?: string;
  connectionFieldKind?: ConnectionFieldKind;
  showDetailsTab?: boolean;
  showConnectionStringTab?: boolean;
  showSslToggle?: boolean;
  placeholders?: Partial<DatasourceFormPlaceholders>;
  fieldLabels?: FieldLabels;
  normalizedKey?: string;
  acceptedKeys?: string[];
}

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
    host: { autoComplete: 'off' },
    port: { type: 'text', inputMode: 'numeric', autoComplete: 'off' },
    database: { autoComplete: 'off' },
    username: { autoComplete: 'off' },
    password: { type: 'password', autoComplete: 'off' },
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
  zodSchema: z.ZodType<Record<string, unknown>>;
};

const limitedStringOrUndefined = (max: number, label: string) =>
  z.union([
    z.string().max(max, `${label} must be at most ${max} characters`),
    z.undefined(),
  ]);

const baseConfigSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    host: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.host,
      'Host',
    ).optional(),
    port: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.port,
      'Port',
    ).optional(),
    database: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.database,
      'Database',
    ).optional(),
    username: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.username,
      'Username',
    ).optional(),
    password: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.password,
      'Password',
    ).optional(),
    connectionUrl: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.url,
      'Connection URL',
    ).optional(),
    connectionString: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.connectionString,
      'Connection string',
    ).optional(),
    url: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.url,
      'URL',
    ).optional(),
    sharedLink: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.sharedLink,
      'Shared link',
    ).optional(),
    jsonUrl: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.url,
      'JSON URL',
    ).optional(),
    apiKey: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.apiKey,
      'API key',
    ).optional(),
    ssl: z.boolean().optional(),
  }),
);

export const S3_FORM_SCHEMA = z
  .object({
    provider: z.enum(['aws', 'digitalocean', 'minio', 'other']),
    endpoint_url: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.endpointUrl,
      'Endpoint URL',
    ),
    aws_access_key_id: z
      .string()
      .min(1, 'Access Key ID is required')
      .max(
        DATASOURCE_INPUT_MAX_LENGTH.accessKeyId,
        `Access Key ID must be at most ${DATASOURCE_INPUT_MAX_LENGTH.accessKeyId} characters`,
      ),
    aws_secret_access_key: z
      .string()
      .min(1, 'Secret Access Key is required')
      .max(
        DATASOURCE_INPUT_MAX_LENGTH.secretAccessKey,
        `Secret Access Key must be at most ${DATASOURCE_INPUT_MAX_LENGTH.secretAccessKey} characters`,
      ),
    aws_session_token: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.sessionToken,
      'Session token',
    ),
    region: z
      .string()
      .min(1, 'Region is required')
      .max(
        DATASOURCE_INPUT_MAX_LENGTH.region,
        `Region must be at most ${DATASOURCE_INPUT_MAX_LENGTH.region} characters`,
      ),
    bucket: z
      .string()
      .min(1, 'Bucket is required')
      .max(
        DATASOURCE_INPUT_MAX_LENGTH.bucket,
        `Bucket must be at most ${DATASOURCE_INPUT_MAX_LENGTH.bucket} characters`,
      ),
    prefix: limitedStringOrUndefined(
      DATASOURCE_INPUT_MAX_LENGTH.prefix,
      'Prefix',
    ),
    format: z.enum(['parquet', 'json']),
    includes: z
      .array(
        z
          .string()
          .max(
            DATASOURCE_INPUT_MAX_LENGTH.patternList,
            `Include pattern must be at most ${DATASOURCE_INPUT_MAX_LENGTH.patternList} characters`,
          ),
      )
      .optional(),
    excludes: z
      .array(
        z
          .string()
          .max(
            DATASOURCE_INPUT_MAX_LENGTH.patternList,
            `Exclude pattern must be at most ${DATASOURCE_INPUT_MAX_LENGTH.patternList} characters`,
          ),
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.provider === 'aws' ||
      (data.endpoint_url && String(data.endpoint_url).trim().length > 0) ||
      (data.provider === 'digitalocean' && data.region?.trim().length > 0),
    {
      message:
        'Endpoint URL required for non-AWS, or set region for DigitalOcean Spaces',
      path: ['endpoint_url'],
    },
  )
  .refine(
    (data) => {
      const u = data.endpoint_url;
      if (!u || typeof u !== 'string' || !u.trim()) return true;
      return isValidHttpUrl(u);
    },
    {
      message: 'Endpoint URL must start with http:// or https://',
      path: ['endpoint_url'],
    },
  );

function normalizeS3Config(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    provider: config.provider ?? 'aws',
    aws_access_key_id: config.aws_access_key_id,
    aws_secret_access_key: config.aws_secret_access_key,
    region: config.region,
    endpoint_url: config.endpoint_url,
    bucket: config.bucket,
    prefix: config.prefix,
    format: config.format ?? 'parquet',
    includes: config.includes,
    excludes: config.excludes,
  };
  if (config.aws_session_token !== undefined && config.aws_session_token !== '')
    normalized.aws_session_token = config.aws_session_token;
  Object.keys(normalized).forEach((key) => {
    const v = normalized[key];
    if (v === '' || v === undefined || (Array.isArray(v) && v.length === 0)) {
      delete normalized[key];
    }
  });
  return normalized;
}

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

const sqlDetailsRequired = (c: Record<string, unknown>) => {
  const url = (c.connectionUrl ?? c.connectionString) as string | undefined;
  if (url && typeof url === 'string' && url.trim().length > 0) return false;
  return true;
};

const SQL_RULE: ProviderRule = {
  connectionFieldKind: 'connectionString',
  showDetailsTab: true,
  showConnectionStringTab: true,
  zodSchema: baseConfigSchema
    .refine((c) => !!(c.connectionUrl || c.connectionString || c.host), {
      message: 'Provide a connection URL or host',
      path: ['connectionUrl'],
    })
    .refine(
      (c) => {
        const u = (c.connectionUrl ?? c.connectionString) as string | undefined;
        if (!u || typeof u !== 'string' || !u.trim()) return true;
        return isValidConnectionString(u);
      },
      {
        message:
          'Use a valid connection URL (e.g. postgresql://…, mysql://…, or http(s)://…)',
        path: ['connectionUrl'],
      },
    )
    .refine(
      (c) => {
        const port = c.port as string | undefined;
        if (!port || typeof port !== 'string' || !port.trim()) return true;
        return /^\d+$/.test(port.trim()) && Number(port.trim()) <= 65535;
      },
      { message: 'Port must be a number (1–65535)', path: ['port'] },
    )
    .refine(
      (c) => {
        const host = c.host as string | undefined;
        if (!host || typeof host !== 'string') return true;
        return host.trim().length > 0;
      },
      { message: 'Host cannot be empty', path: ['host'] },
    )
    .refine(
      (c) => {
        const host = c.host as string | undefined;
        if (!host || typeof host !== 'string' || !host.trim()) return true;
        return isValidHost(host);
      },
      {
        message:
          'Host must be a valid IP address or hostname (e.g. 192.168.1.1 or db.example.com)',
        path: ['host'],
      },
    )
    .refine(
      (c) =>
        !sqlDetailsRequired(c) ||
        (typeof c.host === 'string' && c.host.trim().length > 0),
      { message: 'Host is required', path: ['host'] },
    )
    .refine(
      (c) =>
        !sqlDetailsRequired(c) ||
        (typeof c.port === 'string' && c.port.trim().length > 0),
      { message: 'Port is required', path: ['port'] },
    )
    .refine(
      (c) =>
        !sqlDetailsRequired(c) ||
        (typeof c.database === 'string' && c.database.trim().length > 0),
      { message: 'Database is required', path: ['database'] },
    )
    .refine(
      (c) =>
        !sqlDetailsRequired(c) ||
        (typeof c.username === 'string' && c.username.trim().length > 0),
      { message: 'Username is required', path: ['username'] },
    )
    .refine(
      (c) =>
        !sqlDetailsRequired(c) ||
        (typeof c.password === 'string' && c.password.trim().length > 0),
      { message: 'Password is required', path: ['password'] },
    ),
  isValid: (v) => {
    if (v.connectionUrl || v.connectionString) {
      const u = (v.connectionUrl ?? v.connectionString) as string | undefined;
      return !!(u && typeof u === 'string' && u.trim().length > 0);
    }
    const h = (v.host as string)?.trim();
    const p = (v.port as string)?.trim();
    const d = (v.database as string)?.trim();
    const u = (v.username as string)?.trim();
    const pw = (v.password as string)?.trim();
    return !!(h && p && d && u && pw);
  },
  getValidationError: () =>
    'Provide either a connection URL or fill all parameters (Host, Port, Database, Username, Password)',
  normalize: (c) =>
    c.connectionUrl ? { connectionUrl: c.connectionUrl } : normalizeDetails(c),
};

const API_KEY_RULE: ProviderRule = {
  connectionFieldKind: 'apiKey',
  showDetailsTab: false,
  showConnectionStringTab: true,
  zodSchema: baseConfigSchema
    .refine(
      (c) =>
        !!(
          (c as Record<string, unknown>).apiKey ||
          (c as Record<string, unknown>).connectionUrl ||
          (c as Record<string, unknown>).connectionString
        ),
      { message: 'Provide your API key', path: ['apiKey'] },
    )
    .refine(
      (c) => {
        const key = (c as Record<string, unknown>).apiKey as string | undefined;
        if (!key || typeof key !== 'string') return true;
        return key.trim().length > 0;
      },
      { message: 'API key cannot be empty', path: ['apiKey'] },
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
  options?: { validateHttpUrl?: boolean },
): ProviderRule {
  let schema = baseConfigSchema.refine(
    (c) => acceptedKeys.some((k) => !!(c as Record<string, unknown>)[k]),
    { message, path: [normalizedKey] },
  );
  if (options?.validateHttpUrl) {
    schema = schema.refine(
      (c) => {
        const val = acceptedKeys.reduce<unknown>(
          (acc, k) => acc ?? (c as Record<string, unknown>)[k],
          undefined,
        );
        const s = typeof val === 'string' ? val : '';
        if (!s.trim()) return true;
        return isValidHttpUrl(s);
      },
      {
        message: 'URL must start with http:// or https://',
        path: [normalizedKey],
      },
    );
  }
  return {
    showDetailsTab: false,
    showConnectionStringTab: true,
    zodSchema: schema,
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

/**
 * Sync point: must match `packages/extensions/gsheet-csv` (and registry) for
 * previewUrlKind / previewDataFormat. If the extension definition changes,
 * update this entry or replace with registry-driven meta at call sites.
 */
export const EXTENSION_META_FOR_VALIDATION: Record<
  string,
  DatasourceExtensionMeta
> = {
  'gsheet-csv': {
    id: 'gsheet-csv',
    supportsPreview: true,
    previewUrlKind: 'embeddable',
  },
  'json-online': {
    id: 'json-online',
    supportsPreview: true,
    previewUrlKind: 'data-file',
    previewDataFormat: 'json',
  },
  'parquet-online': {
    id: 'parquet-online',
    supportsPreview: true,
    previewUrlKind: 'data-file',
    previewDataFormat: 'parquet',
  },
  'csv-online': {
    id: 'csv-online',
    supportsPreview: true,
    previewUrlKind: 'data-file',
    previewDataFormat: 'csv',
  },
};

const LEGACY_RULES: Record<string, ProviderRule> = {
  postgresql: {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://www.postgresql.org/docs/current/libpq-connect.html',
    placeholders: {
      connectionString: 'postgresql://user:password@host:5432/database',
    },
  },
  'postgresql-neon': {
    ...SQL_RULE,
    defaultHost: 'ep-xxx.region.aws.neon.tech',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://neon.tech/docs/connect/connect-intro',
    placeholders: {
      connectionString:
        'postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require',
    },
  },
  'postgresql-supabase': {
    ...SQL_RULE,
    defaultHost: 'db.xxx.supabase.co',
    defaultPort: '5432',
    showSslToggle: true,
    docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
    placeholders: {
      connectionString:
        'postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres',
    },
  },
  mysql: {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '3306',
    showSslToggle: true,
    docsUrl:
      'https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-reference-jdbc-url-format.html',
    placeholders: {
      connectionString: 'mysql://user:password@host:3306/database',
    },
  },
  'clickhouse-node': {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '8123',
    showSslToggle: true,
    docsUrl: 'https://clickhouse.com/docs/en/interfaces/http',
    placeholders: {
      connectionString: 'http://localhost:8123',
    },
  },
  'clickhouse-web': {
    ...SQL_RULE,
    defaultHost: 'localhost',
    defaultPort: '8123',
    showSslToggle: true,
    docsUrl: 'https://clickhouse.com/docs/en/interfaces/http',
    placeholders: {
      connectionString: 'http://localhost:8123',
    },
  },
  duckdb: {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://duckdb.org/docs/connectivity/overview',
    placeholders: { connectionString: 'Path or in-memory (e.g. :memory:)' },
  },
  'duckdb-wasm': {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://duckdb.org/docs/connectivity/overview',
    placeholders: { connectionString: 'Path or in-memory (e.g. :memory:)' },
  },
  pglite: {
    ...EMBEDDABLE_RULE,
    docsUrl: 'https://github.com/electric-sql/pglite',
    placeholders: { connectionString: 'Optional database name' },
  },
  'gsheet-csv': {
    ...credentialRule(
      'sharedLink',
      ['sharedLink', 'url'],
      'Provide a Google Sheets shared link',
    ),
    connectionFieldKind: 'sharedLink',
    docsUrl: 'https://support.google.com/docs/answer/2494822',
    placeholders: {
      connectionString: 'https://docs.google.com/spreadsheets/d/.../edit#gid=0',
    },
    fieldLabels: { connectionString: 'Shared link' },
    zodSchema: baseConfigSchema
      .refine(
        (c) => {
          const url = (c.sharedLink || c.url) as string | undefined;
          if (!url) return false;
          const meta = EXTENSION_META_FOR_VALIDATION['gsheet-csv'];
          const { isValid } = validateDatasourceUrl(meta, url);
          return isValid;
        },
        {
          message: 'Provide a valid Google Sheets shared link',
          path: ['sharedLink'],
        },
      )
      .refine(
        (c) => {
          const url = (c.sharedLink || c.url) as string | undefined;
          if (!url) return true;
          return !isDataFileUrl(url);
        },
        {
          message:
            'Use a Google Sheets link, not a direct file link (e.g. .json or .csv).',
          path: ['sharedLink'],
        },
      ),
  },
  'json-online': {
    ...credentialRule(
      'jsonUrl',
      ['jsonUrl', 'url', 'connectionUrl'],
      'Provide a JSON file URL',
    ),
    // Canonicalize storage to `{ url }` so driver/runtime config is stable.
    normalize: (c) => ({
      url: (c.jsonUrl || c.url || c.connectionUrl || c.connectionString) as
        | string
        | undefined,
    }),
    connectionFieldKind: 'fileUrl',
    placeholders: {
      connectionString: 'https://example.com/data.json',
    },
    fieldLabels: { connectionString: 'JSON URL' },
    zodSchema: baseConfigSchema
      .refine(
        (c) => {
          const url =
            c.jsonUrl || c.url || c.connectionUrl || c.connectionString;
          return !!url;
        },
        { message: 'Provide a JSON file URL', path: ['url'] },
      )
      .refine(
        (c) => {
          const url = (c.jsonUrl ||
            c.url ||
            c.connectionUrl ||
            c.connectionString) as string | undefined;
          if (!url || typeof url !== 'string' || !url.trim()) return true;
          return isValidHttpUrl(url);
        },
        {
          message: 'URL must start with http:// or https://',
          path: ['url'],
        },
      ),
  },
  'parquet-online': {
    ...credentialRule(
      'url',
      ['url', 'connectionUrl'],
      'Provide a Parquet file URL',
      { validateHttpUrl: true },
    ),
    connectionFieldKind: 'fileUrl',
    placeholders: {
      connectionString: 'https://example.com/data.parquet',
    },
    fieldLabels: { connectionString: 'File URL' },
  },
  'csv-online': {
    ...credentialRule(
      'url',
      ['url', 'connectionUrl'],
      'Provide a CSV file URL',
      { validateHttpUrl: true },
    ),
    connectionFieldKind: 'fileUrl',
    placeholders: {
      connectionString: 'https://example.com/data.csv',
    },
    fieldLabels: { connectionString: 'File URL' },
    zodSchema: credentialRule(
      'url',
      ['url', 'connectionUrl'],
      'Provide a CSV file URL',
      { validateHttpUrl: true },
    ).zodSchema.refine(
      (c) => {
        const url = (c.url || c.connectionUrl) as string | undefined;
        if (!url || typeof url !== 'string' || !url.trim()) return true;
        return !isGsheetLikeUrl(url);
      },
      {
        message:
          'This looks like a Google Sheets link. Use the Google Sheets datasource instead.',
        path: ['url'],
      },
    ),
  },
  'youtube-data-api-v3': {
    ...API_KEY_RULE,
    docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
    placeholders: {
      connectionString: 'Paste your YouTube Data API v3 key',
    },
    fieldLabels: { connectionString: 'API Key' },
  },
  s3: {
    showDetailsTab: false,
    showConnectionStringTab: false,
    zodSchema: S3_FORM_SCHEMA,
    isValid: (v) => {
      const hasCreds =
        v.bucket &&
        v.region &&
        v.aws_access_key_id &&
        v.aws_secret_access_key &&
        v.format;
      const providerOk =
        v.provider === 'aws' ||
        (v.provider && v.endpoint_url) ||
        (v.provider === 'digitalocean' && v.region);
      return !!(hasCreds && providerOk);
    },
    getValidationError: () =>
      'Provide bucket, region, access key, secret key, and format',
    normalize: normalizeS3Config,
    docsUrl: 'https://docs.aws.amazon.com/s3/',
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
  | { success: false; error: string; zodError?: z.ZodError } {
  const rule = resolveRule(provider, formConfig);
  const parsed = rule.zodSchema.safeParse(config);
  if (parsed.success)
    return { success: true, data: parsed.data as Record<string, unknown> };
  const msg = parsed.error.issues[0]?.message ?? 'Invalid configuration';
  return { success: false, error: msg, zodError: parsed.error };
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
): z.ZodType<Record<string, unknown>> {
  return resolveRule(extensionId, formConfig).zodSchema;
}

export function hasLegacyFormRule(extensionId: string): boolean {
  return extensionId in LEGACY_RULES;
}
