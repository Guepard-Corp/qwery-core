export const FEEDBACK_POSITIVE_TYPES = [
  'fastAndAccurate',
  'goodQueryDecomposition',
  'efficientResourceUse',
  'helpfulVisualization',
  'savedCredits',
  'betterThanExpected',
] as const;

export type FeedbackPositiveType = (typeof FEEDBACK_POSITIVE_TYPES)[number];

export const FEEDBACK_ISSUE_TYPES = [
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

export type FeedbackIssueType = (typeof FEEDBACK_ISSUE_TYPES)[number];

export type FeedbackPayload = {
  type: 'positive' | 'negative';
  comment: string;
  positiveType?: FeedbackPositiveType;
  issueType?: FeedbackIssueType;
};

/** Stored feedback shape in message.metadata.feedback */
export type StoredFeedback = FeedbackPayload & {
  messageId?: string;
  updatedAt?: string;
};

function isFeedbackType(v: unknown): v is 'positive' | 'negative' {
  return v === 'positive' || v === 'negative';
}

function isFeedbackIssueType(v: unknown): v is FeedbackIssueType {
  return (
    typeof v === 'string' &&
    FEEDBACK_ISSUE_TYPES.includes(v as FeedbackIssueType)
  );
}

function isFeedbackPositiveType(v: unknown): v is FeedbackPositiveType {
  return (
    typeof v === 'string' &&
    FEEDBACK_POSITIVE_TYPES.includes(v as FeedbackPositiveType)
  );
}

export function getFeedbackFromMetadata(
  metadata: unknown,
): StoredFeedback | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const meta = metadata as Record<string, unknown>;
  const feedback = meta.feedback;
  if (!feedback || typeof feedback !== 'object') return null;
  const f = feedback as Record<string, unknown>;
  const type = f.type;
  if (!isFeedbackType(type)) return null;
  const comment = typeof f.comment === 'string' ? f.comment : '';
  const result: StoredFeedback = { type, comment };
  if (type === 'positive' && isFeedbackPositiveType(f.positiveType)) {
    result.positiveType = f.positiveType;
  }
  if (type === 'negative' && isFeedbackIssueType(f.issueType)) {
    result.issueType = f.issueType;
  }
  if (typeof f.updatedAt === 'string') result.updatedAt = f.updatedAt;
  if (typeof f.messageId === 'string') result.messageId = f.messageId;
  return result;
}
