import { ExtensionsRegistry } from '@qwery/extensions-sdk';

type Preset = string;
type FormConfig = Record<string, unknown> | null | undefined;

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
  formConfig: FormConfig,
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
      return [(formConfig?.normalizedKey as string) ?? 'sharedLink'];
    case 'apiKey':
      return ['apiKey'];
    case 'fileUrl':
      return [(formConfig?.normalizedKey as string) ?? 'url'];
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
  const entry = ExtensionsRegistry.get(typeId);
  const formConfig = entry?.formConfig as FormConfig;
  const preset = (formConfig?.preset as Preset) ?? 'sql';
  const connectionKeys = connectionKeysForPreset(preset, formConfig);
  const fieldKeys = ['name', ...connectionKeys];
  const fieldLabels =
    (formConfig?.fieldLabels as Record<string, string> | undefined) ?? {};
  const labels: Record<string, string> = {};
  for (const key of fieldKeys) {
    labels[key] = fieldLabels[key] ?? DEFAULT_LABELS[key] ?? key;
  }
  return { fieldKeys, labels };
}
