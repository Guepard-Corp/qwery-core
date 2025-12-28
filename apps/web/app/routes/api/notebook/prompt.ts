import type { ActionFunctionArgs } from 'react-router';
import {
  type UIMessage,
  FactoryAgent,
  validateUIMessages,
  detectIntent,
  PROMPT_SOURCE,
  NOTEBOOK_CELL_TYPE,
  type NotebookCellType,
} from '@qwery/agent-factory-sdk';
import { createRepositories } from '~/lib/repositories/repositories-factory';
import { handleDomainException } from '~/lib/utils/error-handler';
import { v4 as uuidv4 } from 'uuid';

const agents = new Map<string, FactoryAgent>();
const agentLastAccess = new Map<string, number>();
const agentCreationLocks = new Map<string, Promise<FactoryAgent>>();

const AGENT_INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [slug, lastAccess] of agentLastAccess.entries()) {
      if (now - lastAccess > AGENT_INACTIVITY_TIMEOUT) {
        const agent = agents.get(slug);
        if (agent) {
          try {
            agent.stop();
          } catch (error) {
            console.warn(`Error stopping agent ${slug}:`, error);
          }
          agents.delete(slug);
          agentLastAccess.delete(slug);
          agentCreationLocks.delete(slug);
          console.log(`Cleaned up inactive agent for conversation ${slug}`);
        }
      }
    }
  }, CLEANUP_INTERVAL);
}

const repositories = await createRepositories();

async function getOrCreateConversation(
  notebookId: string,
  datasourceId: string,
  projectId: string,
  userId: string,
): Promise<string> {
  
  const existingConversations =
    await repositories.conversation.findByProjectId(projectId);

  
  const notebookTitle = `Notebook - ${notebookId}`;
  const matchingConversation = existingConversations.find(
    (conv) => conv.title === notebookTitle,
  );

  if (matchingConversation) {
    // Update datasources if needed (add this datasource if not present)
    if (
      matchingConversation.datasources &&
      !matchingConversation.datasources.includes(datasourceId)
    ) {
      await repositories.conversation.update({
        ...matchingConversation,
        datasources: [...matchingConversation.datasources, datasourceId],
        updatedBy: userId,
        updatedAt: new Date(),
      });
    }
    return matchingConversation.slug;
  }

 
  const conversationId = uuidv4();
  const now = new Date();
  let conversation;

  try {
    conversation = await repositories.conversation.create({
      id: conversationId,
      slug: '', 
      title: notebookTitle,
      projectId,
      taskId: uuidv4(), 
      datasources: [datasourceId],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      seedMessage: '',
      isPublic: false,
    });
  } catch (error) {
    
    const retryConversations =
      await repositories.conversation.findByProjectId(projectId);
    const retryMatch = retryConversations.find(
      (conv) => conv.title === notebookTitle,
    );
    if (retryMatch) {
      return retryMatch.slug;
    }
    throw error;
  }

  
  return conversation.slug;
}

import { getDefaultModel } from '~/lib/config/model-config';

async function getOrCreateAgent(
  conversationSlug: string,
  model: string = getDefaultModel(),
): Promise<FactoryAgent> {
  let agent = agents.get(conversationSlug);
  if (agent) {
    agentLastAccess.set(conversationSlug, Date.now());
    return agent;
  }

  const existingLock = agentCreationLocks.get(conversationSlug);
  if (existingLock) {
    return existingLock;
  }

  const creationPromise = (async () => {
    try {
      const conversation =
        await repositories.conversation.findBySlug(conversationSlug);
      if (!conversation) {
        throw new Error(
          `Conversation with slug '${conversationSlug}' not found`,
        );
      }

      agent = await FactoryAgent.create({
        conversationSlug: conversationSlug,
        model: model,
        repositories: repositories,
      });

      agents.set(conversationSlug, agent);
      agentLastAccess.set(conversationSlug, Date.now());
      agentCreationLocks.delete(conversationSlug);
      console.log(
        `Agent ${agent.id} created for conversation ${conversationSlug}`,
      );
      return agent;
    } catch (error) {
      agentCreationLocks.delete(conversationSlug);
      throw error;
    }
  })();

  agentCreationLocks.set(conversationSlug, creationPromise);
  return creationPromise;
}

async function extractSqlFromAgentResponse(
  response: Response,
): Promise<{ sqlQuery: string | null; shouldPaste: boolean }> {
  if (!response.body) {
    return { sqlQuery: null, shouldPaste: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sqlQuery: string | null = null;
  let shouldPaste = false;

  console.log(
    '[extractSqlFromAgentResponse] Starting to extract SQL from response',
  );

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Parse SSE format
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) {
          continue;
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            
            if (
              parsed.type === 'message-part' &&
              parsed.part?.type === 'tool-runQuery'
            ) {
              const part = parsed.part;
              if (part.result) {
               
                if (part.result.sqlQuery) {
                  sqlQuery = part.result.sqlQuery;
                  console.log(
                    '[extractSqlFromAgentResponse] Found SQL in tool result:',
                    sqlQuery?.substring(0, 100),
                  );
                } else if (part.input?.query) {
                  sqlQuery = part.input.query;
                  console.log(
                    '[extractSqlFromAgentResponse] Found SQL in tool input:',
                    sqlQuery?.substring(0, 100),
                  );
                }

                
                if (part.result.shouldPaste) {
                  shouldPaste = part.result.shouldPaste;
                  console.log(
                    '[extractSqlFromAgentResponse] Found shouldPaste flag:',
                    shouldPaste,
                  );
                }
              }
            }
          } catch (error) {
            
            console.warn('[extractSqlFromAgentResponse] Parse error:', error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log('[extractSqlFromAgentResponse] Final result:', {
    hasSql: !!sqlQuery,
    shouldPaste,
    sqlPreview: sqlQuery?.substring(0, 100),
  });

  return { sqlQuery, shouldPaste };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json();
  const {
    query,
    notebookId,
    datasourceId,
    projectId,
    userId,
    model = getDefaultModel(),
    notebookCellType,
  } = body;

  if (!query || !notebookId || !datasourceId || !projectId || !userId) {
    return new Response('Missing required fields', { status: 400 });
  }

  try {
   
    const conversationSlug = await getOrCreateConversation(
      notebookId,
      datasourceId,
      projectId,
      userId,
    );

   
    const conversation =
      await repositories.conversation.findBySlug(conversationSlug);
    if (!conversation) {
      throw new Error(
        `Failed to create or find conversation with slug '${conversationSlug}'`,
      );
    }

   
    let needSQL = false;
    try {
      console.log(
        '[Notebook Prompt API] Running intent detection for:',
        query.substring(0, 100),
      );
      const intentResult = await detectIntent(query);
      needSQL = (intentResult as { needsSQL?: boolean }).needsSQL ?? false;
      console.log('[Notebook Prompt API] Intent detection result:', {
        intent: (intentResult as { intent?: string }).intent,
        needSQL,
        needsChart: (intentResult as { needsChart?: boolean }).needsChart,
      });
    } catch (error) {
      console.warn('[Notebook Prompt API] Intent detection failed:', error);
     
      needSQL = false;
    }

    
    const agent = await getOrCreateAgent(conversationSlug, model);

    
    const cellType: NotebookCellType =
      (notebookCellType as NotebookCellType | undefined) ||
      NOTEBOOK_CELL_TYPE.PROMPT;

   
    const messages: UIMessage[] = [
      {
        id: uuidv4(),
        role: 'user',
        parts: [{ type: 'text', text: query }],
        metadata: {
          datasources: [datasourceId],
          promptSource: PROMPT_SOURCE.INLINE,
          notebookCellType: cellType,
          needSQL,
        },
      },
    ];

    console.log('[Notebook Prompt API] Created message with metadata:', {
      promptSource: PROMPT_SOURCE.INLINE,
      notebookCellType: cellType,
      needSQL,
      queryPreview: query.substring(0, 100),
    });

 
    const streamResponse = await agent.respond({
      messages: await validateUIMessages({ messages }),
    });

    
    const { sqlQuery, shouldPaste } =
      await extractSqlFromAgentResponse(streamResponse);
    const hasSql = !!sqlQuery;

    console.log('[Notebook Prompt API] Response:', {
      hasSql,
      shouldPaste,
      needSQL,
      conversationSlug,
      sqlPreview: sqlQuery?.substring(0, 100),
    });

    
    return new Response(
      JSON.stringify({
        sqlQuery: sqlQuery || null,
        hasSql,
        conversationSlug,
        needSQL,
        shouldPaste,
      
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return handleDomainException(error);
  }
}
