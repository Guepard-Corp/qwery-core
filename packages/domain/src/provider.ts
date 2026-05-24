export type ProviderId = 'azure' | 'bedrock' | 'ollama-local' | 'ollama-cloud';

export type FieldType = 'text' | 'secret' | 'select';

export interface ProviderField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  default?: string;
  help?: string;
  /** For `select` fields: fetch the available choices, given values entered so far. */
  loadChoices?: (values: Record<string, string>) => Promise<string[]>;
}

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  kind: 'cloud' | 'local';
  description: string;
  fields: ProviderField[];
}

export interface ProviderConfig {
  id: ProviderId;
  values: Record<string, string>;
}

export interface UserConfig {
  activeProvider?: ProviderId;
  providers: Partial<Record<ProviderId, ProviderConfig>>;
}

async function fetchOllamaModels(baseURL: string): Promise<string[]> {
  const root = baseURL.replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const res = await fetch(`${root}/api/tags`);
  if (!res.ok) {
    throw new Error(`Ollama responded ${res.status} ${res.statusText} at ${root}/api/tags`);
  }
  const data = (await res.json()) as { models?: { name: string }[] };
  const names = (data.models ?? []).map((m) => m.name).filter((n): n is string => !!n);
  if (names.length === 0) {
    throw new Error(`No models installed at ${root}. Pull one first: \`ollama pull qwen2.5-coder:14b\`.`);
  }
  return names.sort();
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: 'azure',
    label: 'Azure OpenAI',
    kind: 'cloud',
    description:
      'Azure-hosted OpenAI models. Supports both Chat Completions and the Responses API (gpt-5, o-series).',
    fields: [
      {
        key: 'resourceName',
        label: 'Resource name',
        type: 'text',
        required: true,
        placeholder: 'my-aoai-resource',
      },
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'deployment', label: 'Deployment name', type: 'text', required: true, placeholder: 'gpt-4o' },
      {
        key: 'apiKind',
        label: 'API kind',
        type: 'text',
        required: true,
        default: 'chat',
        help: "chat | responses (use 'responses' for gpt-5, o1, o3, codex)",
      },
      {
        key: 'apiVersion',
        label: 'API version (optional)',
        type: 'text',
        required: false,
        placeholder: '2025-04-01-preview',
      },
    ],
  },
  {
    id: 'bedrock',
    label: 'AWS Bedrock',
    kind: 'cloud',
    description: 'Amazon Bedrock models authenticated with a Bedrock API key (bearer token).',
    fields: [
      {
        key: 'model',
        label: 'Model ID',
        type: 'text',
        required: true,
        placeholder: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        help: 'Bedrock model or inference-profile ID (e.g. us.anthropic.claude-sonnet-4-20250514-v1:0).',
      },
      {
        key: 'apiKey',
        label: 'Bearer token',
        type: 'secret',
        required: true,
        help: 'Bedrock API key (bearer token). Falls back to the AWS_BEARER_TOKEN_BEDROCK env var if left blank.',
      },
      {
        key: 'region',
        label: 'AWS region (optional)',
        type: 'text',
        required: false,
        placeholder: 'us-east-1',
        help: 'Defaults to the AWS_REGION environment variable when left blank.',
      },
    ],
  },
  {
    id: 'ollama-local',
    label: 'Ollama (local)',
    kind: 'local',
    description:
      'Local Ollama daemon. Make sure `ollama serve` is running. Models with tool support: qwen2.5-coder, llama3.1+, mistral-nemo.',
    fields: [
      {
        key: 'baseURL',
        label: 'Base URL',
        type: 'text',
        required: true,
        default: 'http://localhost:11434/v1',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        loadChoices: (values) => fetchOllamaModels(values.baseURL ?? 'http://localhost:11434/v1'),
      },
    ],
  },
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud',
    kind: 'cloud',
    description: 'Ollama hosted models. Requires an API key from ollama.com.',
    fields: [
      { key: 'baseURL', label: 'Base URL', type: 'text', required: true, default: 'https://ollama.com/v1' },
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'gpt-oss:120b' },
    ],
  },
];

export function getProvider(id: ProviderId): ProviderSpec {
  const found = PROVIDERS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown provider: ${id}`);
  return found;
}
