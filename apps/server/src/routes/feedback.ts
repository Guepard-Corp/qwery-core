import { Hono } from 'hono';
import type { Repositories } from '@qwery/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

const FEEDBACK_TYPES = ['positive', 'negative'] as const;
const POSITIVE_TYPES = [
  'fastAndAccurate',
  'goodQueryDecomposition',
  'efficientResourceUse',
  'helpfulVisualization',
  'savedCredits',
  'betterThanExpected',
] as const;
const ISSUE_TYPES = [
  'uiBug',
  'didNotFollowRequest',
  'incorrectResult',
  'responseIncomplete',
  'poorQueryDecomposition',
  'slowResponse',
  'incorrectDataSource',
  'inefficientQuery',
  'creditsWasted',
  'hallucination',
  'other',
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number];
type PositiveType = (typeof POSITIVE_TYPES)[number];
type IssueType = (typeof ISSUE_TYPES)[number];

interface FeedbackRequestBody {
  messageId: string;
  type: FeedbackType;
  comment: string;
  positiveType?: PositiveType;
  issueType?: IssueType;
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return (
    typeof value === 'string' && FEEDBACK_TYPES.includes(value as FeedbackType)
  );
}

function isPositiveType(value: unknown): value is PositiveType {
  return (
    typeof value === 'string' && POSITIVE_TYPES.includes(value as PositiveType)
  );
}

function isIssueType(value: unknown): value is IssueType {
  return typeof value === 'string' && ISSUE_TYPES.includes(value as IssueType);
}

export function createFeedbackRoutes(
  getRepositories: () => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', async (c) => {
    try {
      const body = (await c.req.json()) as Record<string, unknown>;
      const messageId = body.messageId as string | undefined;
      const type = body.type;
      const comment = body.comment as string | undefined;
      const positiveType = body.positiveType;
      const issueType = body.issueType;

      if (
        !messageId ||
        typeof messageId !== 'string' ||
        messageId.trim() === ''
      ) {
        return c.json({ error: 'messageId is required' }, 400);
      }

      if (!isFeedbackType(type)) {
        return c.json({ error: 'type must be "positive" or "negative"' }, 400);
      }

      if (typeof comment !== 'string') {
        return c.json({ error: 'comment is required' }, 400);
      }

      if (type === 'positive' && !isPositiveType(positiveType)) {
        return c.json(
          {
            error:
              'positiveType is required for positive feedback and must be one of: fastAndAccurate, goodQueryDecomposition, efficientResourceUse, helpfulVisualization, savedCredits, betterThanExpected',
          },
          400,
        );
      }

      if (type === 'negative' && !isIssueType(issueType)) {
        return c.json(
          {
            error:
              'issueType is required for negative feedback and must be one of: uiBug, didNotFollowRequest, incorrectResult, responseIncomplete, poorQueryDecomposition, slowResponse, incorrectDataSource, inefficientQuery, creditsWasted, hallucination, other',
          },
          400,
        );
      }

      const repos = await getRepositories();
      const conversationSlug = body.conversationSlug as string | undefined;

      // Try finding by DB primary key first
      let message = await repos.message.findById(messageId);

      // Fallback: the frontend may send the AI SDK message ID (stored in content.id)
      // In that case, look up the conversation's messages and match by content.id
      if (!message && conversationSlug) {
        const conversation =
          await repos.conversation.findBySlug(conversationSlug);
        if (conversation) {
          const messages = await repos.message.findByConversationId(
            conversation.id,
          );
          message =
            messages.find(
              (m) =>
                (m.content as { id?: string })?.id === messageId,
            ) ?? null;
        }
      }

      if (!message) {
        return c.json({ error: 'Message not found' }, 404);
      }

      const feedbackPayload: FeedbackRequestBody = {
        messageId,
        type,
        comment: comment.trim(),
      };
      if (type === 'positive' && isPositiveType(positiveType)) {
        feedbackPayload.positiveType = positiveType;
      }
      if (type === 'negative' && isIssueType(issueType)) {
        feedbackPayload.issueType = issueType;
      }

      const feedback = {
        ...feedbackPayload,
        updatedAt: new Date().toISOString(),
      };

      const existingMetadata: Record<string, unknown> =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as Record<string, unknown>)
          : {};
      const updatedMetadata = {
        ...existingMetadata,
        feedback,
      };

      const updatedMessage = {
        ...message,
        metadata: updatedMetadata,
        updatedAt: new Date(),
        updatedBy: 'feedback',
      };

      await repos.message.update(updatedMessage);

      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
