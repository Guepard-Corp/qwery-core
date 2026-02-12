'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../shadcn/dialog';
import { Button } from '../../shadcn/button';
import { Textarea } from '../../shadcn/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shadcn/select';
import { Label } from '../../shadcn/label';
import {
  type FeedbackPayload,
  type FeedbackIssueType,
  type FeedbackPositiveType,
  FEEDBACK_ISSUE_TYPES,
  FEEDBACK_POSITIVE_TYPES,
} from './feedback-types';
import { cn } from '../../lib/utils';

const POSITIVE_TYPE_I18N_KEYS: Record<FeedbackPositiveType, string> = {
  fastAndAccurate: 'feedback.positiveType.fastAndAccurate',
  goodQueryDecomposition: 'feedback.positiveType.goodQueryDecomposition',
  efficientResourceUse: 'feedback.positiveType.efficientResourceUse',
  helpfulVisualization: 'feedback.positiveType.helpfulVisualization',
  savedCredits: 'feedback.positiveType.savedCredits',
  betterThanExpected: 'feedback.positiveType.betterThanExpected',
};

const ISSUE_TYPE_I18N_KEYS: Record<FeedbackIssueType, string> = {
  uiBug: 'feedback.issueType.uiBug',
  didNotFollowRequest: 'feedback.issueType.didNotFollowRequest',
  incorrectResult: 'feedback.issueType.incorrectResult',
  responseIncomplete: 'feedback.issueType.responseIncomplete',
  poorQueryDecomposition: 'feedback.issueType.poorQueryDecomposition',
  slowResponse: 'feedback.issueType.slowResponse',
  incorrectDataSource: 'feedback.issueType.incorrectDataSource',
  inefficientQuery: 'feedback.issueType.inefficientQuery',
  creditsWasted: 'feedback.issueType.creditsWasted',
  hallucination: 'feedback.issueType.hallucination',
  other: 'feedback.issueType.other',
};

export interface MessageFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackType: 'positive' | 'negative';
  onSubmit: (payload: FeedbackPayload) => Promise<void>;
  /** Pre-populate form when reopening with existing feedback */
  initialFeedback?: FeedbackPayload | null;
}

export function MessageFeedbackDialog({
  open,
  onOpenChange,
  feedbackType,
  onSubmit,
  initialFeedback,
}: MessageFeedbackDialogProps) {
  const { t } = useTranslation('common');
  const [comment, setComment] = useState(initialFeedback?.comment ?? '');
  const [positiveType, setPositiveType] = useState<FeedbackPositiveType | ''>(
    initialFeedback?.positiveType ?? '',
  );
  const [issueType, setIssueType] = useState<FeedbackIssueType | ''>(
    initialFeedback?.issueType ?? '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialFeedback) {
      setComment(initialFeedback.comment ?? '');
      setPositiveType(initialFeedback.positiveType ?? '');
      setIssueType(initialFeedback.issueType ?? '');
    } else if (!open) {
      setComment('');
      setPositiveType('');
      setIssueType('');
    }
  }, [open, initialFeedback]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (feedbackType === 'positive' && !positiveType) return;
      if (feedbackType === 'negative' && !issueType) return;

      setIsSubmitting(true);
      try {
        const payload: FeedbackPayload = {
          type: feedbackType,
          comment: comment.trim(),
          ...(feedbackType === 'positive' &&
            positiveType && {
              positiveType: positiveType as FeedbackPositiveType,
            }),
          ...(feedbackType === 'negative' &&
            issueType && { issueType: issueType as FeedbackIssueType }),
        };
        await onSubmit(payload);
        setComment('');
        setPositiveType('');
        setIssueType('');
        onOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [feedbackType, comment, positiveType, issueType, onSubmit, onOpenChange],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !isSubmitting) {
        setComment('');
        setPositiveType('');
        setIssueType('');
      }
      onOpenChange(next);
    },
    [onOpenChange, isSubmitting],
  );

  const isSubmitDisabled =
    isSubmitting ||
    (feedbackType === 'positive' && !positiveType) ||
    (feedbackType === 'negative' && !issueType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-test="message-feedback-dialog"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('feedback.tellUsMore')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {feedbackType === 'positive' && (
              <div className="grid gap-2">
                <Label htmlFor="feedback-positive-type">
                  {t('feedback.positiveTypeLabel')}
                </Label>
                <Select
                  value={positiveType}
                  onValueChange={(v) =>
                    setPositiveType(v as FeedbackPositiveType)
                  }
                  required
                >
                  <SelectTrigger id="feedback-positive-type">
                    <SelectValue
                      placeholder={t('feedback.positiveTypeLabel')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_POSITIVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(POSITIVE_TYPE_I18N_KEYS[type])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {feedbackType === 'negative' && (
              <div className="grid gap-2">
                <Label htmlFor="feedback-issue-type">
                  {t('feedback.issueTypeLabel')}
                </Label>
                <Select
                  value={issueType}
                  onValueChange={(v) => setIssueType(v as FeedbackIssueType)}
                  required
                >
                  <SelectTrigger id="feedback-issue-type">
                    <SelectValue placeholder={t('feedback.issueTypeLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_ISSUE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(ISSUE_TYPE_I18N_KEYS[type])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="feedback-comment">
                {feedbackType === 'positive'
                  ? t('feedback.positiveCommentPlaceholder')
                  : t('feedback.negativeCommentPlaceholder')}
              </Label>
              <Textarea
                id="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  feedbackType === 'positive'
                    ? t('feedback.positiveCommentPlaceholder')
                    : t('feedback.negativeCommentPlaceholder')
                }
                className={cn('min-h-[80px] resize-none')}
                data-test="feedback-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              data-test="feedback-submit"
            >
              {t('feedback.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
