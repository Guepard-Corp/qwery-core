'use client';

import { cn } from '../../lib/utils';
import { Skeleton } from '../../shadcn/skeleton';
import type { SuggestionMetadata } from './utils/suggestion-pattern';

export interface SuggestionBadgeItem {
  text: string;
  metadata?: SuggestionMetadata;
}

export interface SuggestionBadgesProps {
  suggestions: SuggestionBadgeItem[];
  onSuggestionClick: (text: string, metadata?: SuggestionMetadata) => void;
  className?: string;
  disabled?: boolean;
}

const badgeButtonClass = cn(
  'border-border/50 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground',
  'cursor-pointer rounded-md border px-4 py-2.5 text-sm transition-colors',
  'dark:hover:border-white',
);

export function SuggestionBadges({
  suggestions,
  onSuggestionClick,
  className,
  disabled = false,
}: SuggestionBadgesProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2.5 py-3 transition-opacity duration-300',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      data-test="suggestion-badges"
      aria-hidden={disabled}
    >
      {suggestions.map((item) => (
        <button
          key={item.text}
          type="button"
          className={badgeButtonClass}
          disabled={disabled}
          aria-disabled={disabled}
          onClick={() =>
            !disabled && onSuggestionClick(item.text, item.metadata)
          }
          onKeyDown={(e) => {
            if (disabled) {
              e.preventDefault();
              return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSuggestionClick(item.text, item.metadata);
            }
          }}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}

const SKELETON_WIDTHS = ['w-20', 'w-28', 'w-24'];

export function SuggestionBadgesSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-2.5 py-3',
        className,
      )}
      data-test="suggestion-badges-skeleton"
    >
      {SKELETON_WIDTHS.map((w, i) => (
        <Skeleton key={i} className={cn('h-9 rounded-md', w)} />
      ))}
    </div>
  );
}
