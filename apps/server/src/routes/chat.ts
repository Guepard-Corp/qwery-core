import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  prompt,
  getDefaultModel,
  validateUIMessages,
  PROMPT_SOURCE,
  type PromptSource,
  type NotebookCellType,
  type UIMessage,
} from '@qwery/agent-factory-sdk';
import { normalizeUIRole } from '@qwery/shared/message-role-utils';
import type { Repositories } from '@qwery/domain/repositories';
import { createRepositories } from '../lib/repositories';
import { getTelemetry } from '../lib/telemetry';
import { resolveChatDatasources } from '../helpers/chat-helper';

const chatBodySchema = z.object({
  messages: z.array(z.unknown()),
  model: z.string().optional(),
  datasources: z.array(z.string()).optional(),
  trigger: z.enum(['submit-message', 'regenerate-message']).optional(),
});

const chatParamSchema = z.object({
  slug: z.string().min(1),
});

let repositoriesPromise: Promise<Repositories> | undefined;

async function getRepositories(): Promise<Repositories> {
  if (!repositoriesPromise) {
    repositoriesPromise = createRepositories();
  }
  return repositoriesPromise;
}

export function createChatRoutes() {
  const app = new Hono();

  app.post(
    '/:slug',
    zValidator('param', chatParamSchema),
    zValidator('json', chatBodySchema),
    async (c) => {
      const { slug } = c.req.valid('param');
      const body = c.req.valid('json');
      const messages = body.messages as UIMessage[];
      const model = body.model ?? getDefaultModel();

      // [DEBUG] Chat request: trace datasources
      console.log('[chat] POST', slug, {
        bodyKeys: Object.keys(body),
        datasources,
        datasourcesLength: Array.isArray(datasources) ? datasources.length : 'not-array',
        model,
      });

      const repositories = await getRepositories();
      const datasources = await resolveChatDatasources({
        bodyDatasources: body.datasources,
        messages,
        conversationSlug: slug,
        conversationRepository: repositories.conversation,
      });
      const telemetry = await getTelemetry();

      //TODO: implement intent detection
      const needSQL = false;

      const processedMessages = messages.map(
        (message: UIMessage, index: number) => {
          const isLastUserMessage =
            normalizeUIRole(message.role) === 'user' &&
            index === messages.length - 1;

          if (isLastUserMessage) {
            const messageMetadata = (message.metadata ?? {}) as Record<
              string,
              unknown
            >;
            const isNotebookSource =
              messageMetadata.promptSource === PROMPT_SOURCE.INLINE ||
              messageMetadata.notebookCellType !== undefined;
            const promptSource: PromptSource = isNotebookSource
              ? PROMPT_SOURCE.INLINE
              : PROMPT_SOURCE.CHAT;
            const notebookCellType = messageMetadata.notebookCellType as
              | NotebookCellType
              | undefined;

            const cleanMetadata = { ...messageMetadata };
            delete (cleanMetadata as Record<string, unknown>).source;

            return {
              ...message,
              metadata: {
                ...cleanMetadata,
                promptSource,
                needSQL,
                ...(notebookCellType ? { notebookCellType } : {}),
                ...(datasources && datasources.length > 0
                  ? { datasources }
                  : {}),
              },
            };
          }

          if (normalizeUIRole(message.role) === 'user') {
            const textPart = message.parts?.find(
              (p): p is { type: 'text'; text: string } =>
                p.type === 'text' && 'text' in p,
            );
            if (textPart) {
              const text = textPart.text;
              const guidanceMarker = '__QWERY_SUGGESTION_GUIDANCE__';
              const guidanceEndMarker = '__QWERY_SUGGESTION_GUIDANCE_END__';

              if (text.includes(guidanceMarker)) {
                const endIndex = text.indexOf(guidanceEndMarker);
                if (endIndex !== -1) {
                  const cleanText = text
                    .substring(endIndex + guidanceEndMarker.length)
                    .trim();

                  const suggestionGuidance = `[SUGGESTION WORKFLOW GUIDANCE]
- This is a suggested next step from a previous response - execute it directly and efficiently
- Use the provided context (previous question/answer) to understand the full conversation flow
- Be action-oriented: proceed immediately with the requested operation without asking for confirmation
- Keep your response concise and focused on delivering the requested result
- If the suggestion involves a query or analysis, execute it and present the findings clearly

User request: ${cleanText}`;

                  return {
                    ...message,
                    parts: message.parts?.map((part) => {
                      if (part.type === 'text' && 'text' in part) {
                        return { ...part, text: suggestionGuidance };
                      }
                      return part;
                    }),
                  };
                }
              }
            }
          }

          return message;
        },
      );

      if (processedMessages.length === 0) {
        return c.json({ error: 'Messages array must not be empty' }, 400);
      }

      const validatedMessages = await validateUIMessages({
        messages: processedMessages,
      });

      const mcpServerUrl =
        process.env.QWERY_MCP_SERVER_URL ?? `${new URL(c.req.url).origin}/mcp`;

      const response = await prompt({
        conversationSlug: slug,
        messages: validatedMessages,
        model,
        datasources,
        repositories,
        telemetry,
        generateTitle: true,
        mcpServerUrl,
      });

      return response;
    },
  );

  return app;
}
