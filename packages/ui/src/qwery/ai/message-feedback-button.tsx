'use client';

import { useState, useCallback } from 'react';
import { ThumbsUpIcon, ThumbsDownIcon } from 'lucide-react';
import { Button } from '../../shadcn/button';
import { MessageFeedbackDialog } from './message-feedback-dialog';
import type { FeedbackPayload, StoredFeedback } from './feedback-types';

export interface MessageFeedbackButtonProps {
  messageId: string;
  onSubmitFeedback: (
    messageId: string,
    feedback: FeedbackPayload,
  ) => Promise<void>;
  /** When present, color thumbs and pre-populate dialog on click */
  existingFeedback?: StoredFeedback | null;
}

export function MessageFeedbackButton({
  messageId,
  onSubmitFeedback,
  existingFeedback,
}: MessageFeedbackButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>(
    existingFeedback?.type ?? 'positive',
  );

  const handleThumbClick = useCallback((type: 'positive' | 'negative') => {
    setFeedbackType(type);
    setDialogOpen(true);
  }, []);

  const handleDialogSubmit = useCallback(
    async (payload: FeedbackPayload) => {
      await onSubmitFeedback(messageId, payload);
    },
    [messageId, onSubmitFeedback],
  );

  const initialFeedback: FeedbackPayload | null = existingFeedback
    ? {
        type: existingFeedback.type,
        comment: existingFeedback.comment ?? '',
        ...(existingFeedback.positiveType && {
          positiveType: existingFeedback.positiveType,
        }),
        ...(existingFeedback.issueType && {
          issueType: existingFeedback.issueType,
        }),
      }
    : null;

  const hasPositiveFeedback = existingFeedback?.type === 'positive';
  const hasNegativeFeedback = existingFeedback?.type === 'negative';

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${hasPositiveFeedback ? 'text-blue-600' : ''}`}
        onClick={() => handleThumbClick('positive')}
        title={hasPositiveFeedback ? 'View or edit feedback' : 'Good response'}
        data-test="feedback-thumbs-up"
      >
        <ThumbsUpIcon className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${hasNegativeFeedback ? 'text-red-600' : ''}`}
        onClick={() => handleThumbClick('negative')}
        title={hasNegativeFeedback ? 'View or edit feedback' : 'Bad response'}
        data-test="feedback-thumbs-down"
      >
        <ThumbsDownIcon className="size-3" />
      </Button>
      <MessageFeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        feedbackType={feedbackType}
        onSubmit={handleDialogSubmit}
        initialFeedback={initialFeedback}
      />
    </>
  );
}
