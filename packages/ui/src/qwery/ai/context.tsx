'use client';

import { LanguageModelUsage } from 'ai';
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from '../../ai-elements/context';

export type QweryContextProps = {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: string;
};
export default function QweryContext(props: QweryContextProps) {
  const usedTokens = Number(props.usedTokens) || 0;
  const maxTokens = Number(props.maxTokens) || 0;

  const percentage =
    maxTokens > 0 && !isNaN(usedTokens) && !isNaN(maxTokens)
      ? (usedTokens / maxTokens) * 100
      : 0;

  const colorClass =
    percentage >= 90
      ? 'text-red-500'
      : percentage >= 80
        ? 'text-orange-500'
        : '';

  const hoverOpen = percentage > 0 ? undefined : false;

  return (
    <Context
      maxTokens={maxTokens}
      modelId={props.modelId}
      open={hoverOpen}
      usage={props.usage}
      usedTokens={usedTokens}
    >
      <ContextTrigger className={colorClass} />
      {percentage > 0 && (
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
      )}
    </Context>
  );
}
