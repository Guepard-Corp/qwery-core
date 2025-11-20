import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import {
  createChatModel,
  type LlmProviderConfig,
} from '@qwery/ai-agents/llm-provider';

function resolveLlmConfig(): LlmProviderConfig {
  const provider =
    (process.env.CLI_LLM_PROVIDER ||
      process.env.QWERY_LLM_PROVIDER ||
      'azure') as 'webllm' | 'azure' | 'bedrock';

  if (provider === 'webllm') {
    // WebLLM is browser-only and requires browser APIs (window, location, etc.)
    // It cannot run in Node.js CLI environment
    throw new Error(
      'WebLLM provider is not supported in CLI environment. WebLLM requires browser APIs and is designed for browser use only. Please use "azure" or "bedrock" providers in CLI. Set CLI_LLM_PROVIDER=azure or CLI_LLM_PROVIDER=bedrock',
    );
  }

  if (provider === 'azure') {
    const apiKey = process.env.AZURE_API_KEY;
    const endpoint = process.env.AZURE_ENDPOINT;
    const apiVersion = process.env.AZURE_API_VERSION || '2024-04-01-preview';
    const deployment = process.env.AZURE_DEPLOYMENT_ID || 'gpt-4o-mini';

    if (!apiKey || !endpoint) {
      throw new Error(
        'AZURE_API_KEY and AZURE_ENDPOINT must be set to use the Azure provider.',
      );
    }

    return {
      provider: 'azure',
      apiKey,
      endpoint,
      deployment,
      apiVersion,
      temperature: Number(process.env.CLI_LLM_TEMPERATURE || '0.1') || 0.1,
    };
  }

  if (provider === 'bedrock') {
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

    return {
      provider: 'bedrock',
      model,
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken,
      temperature: Number(process.env.CLI_LLM_TEMPERATURE || '0.1') || 0.1,
    };
  }

  throw new Error(
    `Unsupported LLM provider "${provider}". Use "webllm", "azure", or "bedrock".`,
  );
}

export class SqlAgent {
  private readonly chatModel: BaseChatModel;

  constructor() {
    const llmConfig = resolveLlmConfig();
    this.chatModel = createChatModel(llmConfig);
  }

  public async generateSql(options: {
    datasourceName: string;
    naturalLanguage: string;
    schemaDescription: string;
  }): Promise<string> {
    const { datasourceName, naturalLanguage, schemaDescription } = options;
    const prompt = `You are a SQL assistant.
Datasource: ${datasourceName}
Schema:
${schemaDescription}

Write a valid SQL query that satisfies the following request:
${JSON.stringify(naturalLanguage)}

Rules:
- Return only SQL (no code fences, no commentary).
- Prefer fully qualified table names schema.table when ambiguous.
- Never execute statements that modify or drop data.`;

    try {
      const response = await this.chatModel.invoke([
        new HumanMessage(prompt),
      ]);

      const content = response.content;
      if (!content) {
        throw new Error('LLM returned an empty response');
      }

      const sql =
        typeof content === 'string' ? content : JSON.stringify(content);
      const cleaned = sql.trim();

      this.assertSqlIsSafe(cleaned);

      return cleaned;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate SQL: ${message}`);
    }
  }

  private assertSqlIsSafe(sql: string): void {
    const allowedPrefix = /^(SELECT|WITH)\b/i;
    const forbiddenKeywords =
      /\b(ALTER|CREATE|DROP|TRUNCATE|DELETE|UPDATE|INSERT|GRANT|REVOKE)\b/i;

    if (!allowedPrefix.test(sql)) {
      throw new Error(
        `Generated SQL must start with SELECT or WITH. Received: ${sql}`,
      );
    }

    if (forbiddenKeywords.test(sql)) {
      throw new Error(
        'Generated SQL contains potentially destructive statements and was rejected.',
      );
    }
  }
}

