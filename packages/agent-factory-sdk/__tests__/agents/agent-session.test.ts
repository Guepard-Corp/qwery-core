import { describe, expect, it, beforeEach } from 'vitest';
import type { Conversation } from '@qwery/domain/entities';
import type { Repositories } from '@qwery/domain/repositories';
import {
  ConversationRepository,
  MessageRepository,
  UserRepository,
  OrganizationRepository,
  ProjectRepository,
  DatasourceRepository,
  NotebookRepository,
  UsageRepository,
  TodoRepository,
} from '@qwery/repository-in-memory';
import { createOtelNullTelemetryService } from '@qwery/telemetry/otel';
import { prompt } from '../../src/agents/agent-session';

function createRepositories(): Repositories {
  return {
    user: new UserRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    datasource: new DatasourceRepository(),
    notebook: new NotebookRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    usage: new UsageRepository(),
    todo: new TodoRepository(),
  };
}

async function readStreamAsText(
  body: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

describe('agent-session prompt', () => {
  let repositories: Repositories;
  const conversationSlug = 'test-conv-slug';
  const conversationId = '00000000-0000-0000-0000-000000000000';

  beforeEach(() => {
    repositories = createRepositories();
  });

  it('sends "hello", receives stream with assistant parts from LLM (E2E)', async () => {
    const conversation: Conversation = {
      id: conversationId,
      title: 'New Conversation',
      seedMessage: '',
      projectId: '00000000-0000-0000-0000-000000000010',
      taskId: '00000000-0000-0000-0000-000000000020',
      slug: conversationSlug,
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test',
      updatedBy: 'test',
      isPublic: false,
    };
    await repositories.conversation.create(conversation);

    const telemetry = createOtelNullTelemetryService();
    const response = await prompt({
      conversationSlug,
      messages: [
        {
          id: 'user-msg-1',
          role: 'user',
          content: 'hello',
          parts: [{ type: 'text', text: 'hello' }],
        },
      ],
      repositories,
      telemetry,
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();

    const streamText = await readStreamAsText(response.body!);
    expect(streamText.length).toBeGreaterThan(0);

    const hasAssistantContent =
      streamText.includes('0:') ||
      streamText.includes('text-delta') ||
      streamText.includes('"text"') ||
      /[a-zA-Z]{2,}/.test(streamText);
    expect(hasAssistantContent).toBe(true);
  });
});
