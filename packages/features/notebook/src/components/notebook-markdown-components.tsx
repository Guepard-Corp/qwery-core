import * as React from 'react';
import type { HTMLAttributes } from 'react';

import type { Components } from 'react-markdown';

import { cn } from '@qwery/ui/utils';

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  node?: unknown;
};

export const notebookMarkdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      {...props}
      className={cn('text-2xl leading-tight font-semibold', className)}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      {...props}
      className={cn('text-xl leading-tight font-semibold', className)}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      {...props}
      className={cn('text-lg leading-tight font-semibold', className)}
    />
  ),
  p: ({ className, ...props }) => (
    <p {...props} className={cn('my-2 text-sm leading-6', className)} />
  ),
  a: ({ className, ...props }) => (
    <a
      {...props}
      className={cn(
        'text-primary decoration-primary/50 hover:decoration-primary underline underline-offset-2 transition',
        className,
      )}
      target="_blank"
      rel="noreferrer"
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      {...props}
      className={cn('my-2 list-disc pl-6 text-sm leading-6', className)}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      {...props}
      className={cn('my-2 list-decimal pl-6 text-sm leading-6', className)}
    />
  ),
  li: ({ className, ...props }) => (
    <li
      {...props}
      className={cn(
        'marker:text-muted-foreground my-1 text-sm leading-6',
        className,
      )}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      {...props}
      className={cn(
        'border-border/60 text-muted-foreground my-4 border-l-2 pl-4 text-sm italic',
        className,
      )}
    />
  ),
  code: ({ inline, className, children, ...props }: MarkdownCodeProps) => {
    if (inline) {
      return (
        <code
          {...props}
          className={cn(
            'bg-muted/60 rounded px-1.5 py-0.5 font-mono text-xs',
            className,
          )}
        >
          {children}
        </code>
      );
    }
    return (
      <pre
        className={cn(
          'bg-muted/50 text-muted-foreground/90 relative my-3 overflow-x-auto rounded-md p-4 text-xs',
          className,
        )}
      >
        <code {...props} className="font-mono leading-5">
          {children}
        </code>
      </pre>
    );
  },
  table: ({ className, ...props }) => (
    <div className="my-4 w-full overflow-x-auto">
      <table
        {...props}
        className={cn(
          '[&_tr:nth-child(even)]:bg-muted/30 w-full border-collapse text-left text-sm [&_td]:py-2 [&_td]:align-top [&_th]:border-b [&_th]:pb-2 [&_th]:text-xs',
          className,
        )}
      />
    </div>
  ),
};
