import type { ReactNode } from 'react';

import { cn } from './cn';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightSearchMatch(
  text: string,
  query: string,
  options?: {
    highlightClassName?: string;
  },
): ReactNode {
  if (!query.trim()) return text;

  const safeQuery = escapeRegExp(query.trim());
  if (!safeQuery) return text;

  const regex = new RegExp(`(${safeQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;
    const isMatch = part.toLowerCase() === query.toLowerCase();

    if (!isMatch) {
      return (
        <span key={index} className="whitespace-pre">
          {part}
        </span>
      );
    }

    return (
      <span
        key={index}
        className={cn(
          'text-foreground rounded-[2px] bg-[#ffcb51]/40 px-0.5',
          options?.highlightClassName,
        )}
      >
        {part}
      </span>
    );
  });
}
