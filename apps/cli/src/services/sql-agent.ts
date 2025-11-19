import { createAzure } from '@ai-sdk/azure';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { generateText } from 'ai';

type AiChatModel = Parameters<typeof generateText>[0]['model'];

type SupportedProvider = 'azure' | 'bedrock';

function resolveProvider(): SupportedProvider {
  const provider =
    (process.env.CLI_LLM_PROVIDER ||
      process.env.QWERY_LLM_PROVIDER ||
      'azure') as SupportedProvider;
  if (provider !== 'azure' && provider !== 'bedrock') {
    throw new Error(
      `Unsupported LLM provider "${provider}". Use "azure" or "bedrock".`,
    );
  }
  return provider;
}

function createAzureModel(): AiChatModel {
  const apiKey = process.env.AZURE_API_KEY;
  const endpoint = process.env.AZURE_ENDPOINT;
  const apiVersion = process.env.AZURE_API_VERSION || '2024-04-01-preview';
  const deployment = process.env.AZURE_DEPLOYMENT_ID || 'gpt-4o-mini';

  if (!apiKey || !endpoint) {
    throw new Error(
      'AZURE_API_KEY and AZURE_ENDPOINT must be set to use the Azure provider.',
    );
  }

  const azure = createAzure({
    apiKey,
    baseURL: `${endpoint.replace(/\/+$/, '')}/openai`,
    apiVersion,
    useDeploymentBasedUrls: true,
  });

  return azure(deployment) as unknown as AiChatModel;
}

function createBedrockModel(): AiChatModel {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const model =
    process.env.BEDROCK_MODEL_ID ||
    'anthropic.claude-3-5-sonnet-20241022-v2:0';

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be set to use the Bedrock provider.',
    );
  }

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined,
  });

  return bedrock(model) as unknown as AiChatModel;
}

function resolveModel(): AiChatModel {
  const provider = resolveProvider();
  if (provider === 'azure') {
    return createAzureModel();
  }
  return createBedrockModel();
}

export class SqlAgent {
  private readonly model: AiChatModel;

  constructor() {
    this.model = resolveModel();
  }

  public async generateSql(options: {
    datasourceName: string;
    naturalLanguage: string;
    schemaDescription: string;
  }): Promise<string> {
    const { datasourceName, naturalLanguage, schemaDescription } = options;
    const prompt = `
You are a SQL assistant. 
Datasource: ${datasourceName}
Schema:
${schemaDescription}

Write a valid SQL query that satisfies the following request:
"${naturalLanguage}"

Rules:
- Return only SQL (no code fences, no commentary).
- Prefer fully qualified table names schema.table when ambiguous.
`;

    const { text } = await generateText({
      model: this.model,
      prompt,
    });

    return text.trim();
  }
}

