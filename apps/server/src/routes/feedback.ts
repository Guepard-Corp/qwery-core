import { Hono } from 'hono';
import type { Repositories } from '@qwery/domain/repositories';
import { Code } from '@qwery/domain/common';
import {
  handleDomainException,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
} from '../lib/http-utils';

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
        return createValidationErrorResponse('messageId is required');
      }

      if (!isFeedbackType(type)) {
        return createValidationErrorResponse(
          'type must be "positive" or "negative"',
        );
      }

      if (typeof comment !== 'string') {
        return createValidationErrorResponse('comment is required');
      }

      if (type === 'positive' && !isPositiveType(positiveType)) {
        return createValidationErrorResponse(
          'positiveType is required for positive feedback and must be one of: fastAndAccurate, goodQueryDecomposition, efficientResourceUse, helpfulVisualization, savedCredits, betterThanExpected',
        );
      }

      if (type === 'negative' && !isIssueType(issueType)) {
        return createValidationErrorResponse(
          'issueType is required for negative feedback and must be one of: uiBug, didNotFollowRequest, incorrectResult, responseIncomplete, poorQueryDecomposition, slowResponse, incorrectDataSource, inefficientQuery, creditsWasted, hallucination, other',
        );
      }

      const repos = await getRepositories();
      const message = await repos.message.findById(messageId);

      if (!message) {
        return createNotFoundErrorResponse(
          'Message not found',
          Code.MESSAGE_NOT_FOUND_ERROR,
        );
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
