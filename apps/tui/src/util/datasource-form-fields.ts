type Preset = string;

/** Form metadata by extension id (preset, normalizedKey). No longer on extension definition. */
const EXTENSION_FORM_META: Record<
  string,
  { preset: Preset; normalizedKey?: string }
> = {
  'gsheet-csv': { preset: 'sharedLink', normalizedKey: 'sharedLink' },
  'json-online': { preset: 'fileUrl', normalizedKey: 'jsonUrl' },
  'parquet-online': { preset: 'fileUrl', normalizedKey: 'url' },
  s3: { preset: 's3' },
  duckdb: { preset: 'embeddable' },
  'duckdb-wasm': { preset: 'embeddable' },
  pglite: { preset: 'embeddable' },
  'youtube-data-api-v3': { preset: 'apiKey' },
};

const DEFAULT_LABELS: Record<string, string> = {
  name: 'Name',
  host: 'Host',
  port: 'Port',
  database: 'Database',
  username: 'Username',
  password: 'Password',
  connectionString: 'Connection string',
  connectionUrl: 'Connection URL',
  sharedLink: 'Shared link',
  url: 'URL',
  apiKey: 'API key',
  jsonUrl: 'JSON URL',
  bucket: 'Bucket',
  region: 'Region',
  aws_access_key_id: 'Access key ID',
  aws_secret_access_key: 'Secret access key',
  endpoint_url: 'Endpoint URL',
  prefix: 'Prefix',
  format: 'Format',
  provider: 'Provider',
};

function connectionKeysForPreset(
  preset: Preset,
  normalizedKey?: string | null,
): string[] {
  switch (preset) {
    case 'sql':
      return [
        'host',
        'port',
        'database',
        'username',
        'password',
        'connectionString',
      ];
    case 'sharedLink':
      return [normalizedKey ?? 'sharedLink'];
    case 'apiKey':
      return ['apiKey'];
    case 'fileUrl':
      return [normalizedKey ?? 'url'];
    case 'embeddable':
      return ['database'];
    case 's3':
      return [
        'provider',
        'bucket',
        'region',
        'aws_access_key_id',
        'aws_secret_access_key',
        'endpoint_url',
        'prefix',
        'format',
      ];
    default:
      return ['connectionUrl', 'connectionString'];
  }
}

export interface FormFieldsResult {
  fieldKeys: string[];
  labels: Record<string, string>;
}

export function getFormFieldsForType(typeId: string): FormFieldsResult {
  const meta = EXTENSION_FORM_META[typeId];
  const preset = meta?.preset ?? 'sql';
  const normalizedKey = meta?.normalizedKey ?? null;
  const connectionKeys = connectionKeysForPreset(preset, normalizedKey);
  const fieldKeys = ['name', ...connectionKeys];
  const labels: Record<string, string> = {};
  for (const key of fieldKeys) {
    labels[key] = DEFAULT_LABELS[key] ?? key;
  }
  return { fieldKeys, labels };
}
