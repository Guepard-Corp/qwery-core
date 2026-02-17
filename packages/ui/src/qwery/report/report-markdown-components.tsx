import * as React from 'react';
import type { HTMLAttributes } from 'react';
import type { Components } from 'react-markdown';
import { cn } from '../../lib/utils';
import { VegaChart } from './vega-chart';

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  node?: unknown;
};

export const reportMarkdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      {...props}
      className={cn(
        'text-foreground mt-12 mb-4 text-2xl font-bold tracking-tight [letter-spacing:-0.02em] first:mt-0',
        className,
      )}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      {...props}
      className={cn(
        'text-foreground mt-10 mb-3 text-xl font-semibold tracking-tight',
        className,
      )}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      {...props}
      className={cn(
        'text-foreground mt-8 mb-2 text-lg font-semibold',
        className,
      )}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      {...props}
      className={cn(
        'text-foreground/90 my-4 text-[15px] leading-[1.75]',
        className,
      )}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      {...props}
      className={cn(
        'text-primary decoration-primary/60 hover:decoration-primary underline underline-offset-4 transition-colors',
        className,
      )}
      target="_blank"
      rel="noreferrer"
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      {...props}
      className={cn(
        'text-foreground/90 my-5 list-none space-y-2 pl-0 text-[15px] leading-[1.75]',
        className,
      )}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      {...props}
      className={cn(
        'text-foreground/90 my-5 list-decimal space-y-2 pl-6 text-[15px] leading-[1.75] [counter-reset:list-item]',
        className,
      )}
    />
  ),
  li: ({ className, ...props }) => (
    <li
      {...props}
      className={cn(
        'text-foreground/90 relative text-[15px] leading-[1.75]',
        '[ul_&]:before:bg-primary/40 [ul_&]:pl-5 [ul_&]:before:absolute [ul_&]:before:top-[0.4em] [ul_&]:before:left-0 [ul_&]:before:h-1.5 [ul_&]:before:w-1.5 [ul_&]:before:rounded-full',
        '[ol_&]:pl-1',
        className,
      )}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      {...props}
      className={cn(
        'border-primary/30 text-foreground/80 my-6 border-l-4 pl-5 text-[15px] leading-[1.75] italic',
        'bg-muted/30 -mx-2 rounded-r-lg py-1 pr-4',
        className,
      )}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      {...props}
      className={cn('border-border/60 my-8 border-t bg-transparent', className)}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong
      {...props}
      className={cn('text-foreground font-semibold', className)}
    />
  ),
  em: ({ className, ...props }) => (
    <em {...props} className={cn('italic', className)} />
  ),
  table: ({ className, ...props }) => (
    <div className="border-border/50 my-6 w-full overflow-x-auto rounded-xl border">
      <table
        {...props}
        className={cn(
          'w-full border-collapse text-left text-sm',
          '[&_th]:border-border/50 [&_th]:bg-muted/40 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase',
          '[&_td]:border-border/30 [&_td]:border-t [&_td]:px-4 [&_td]:py-3 [&_td]:text-[15px]',
          '[&_tr:hover]:bg-muted/20',
          className,
        )}
      />
    </div>
  ),
  code: ({ inline, className, children, ...props }: MarkdownCodeProps) => {
    if (inline) {
      return (
        <code
          {...props}
          className={cn(
            'bg-muted/50 text-foreground/90 border-border/30 rounded-md border px-1.5 py-0.5 font-mono text-[13px]',
            className,
          )}
        >
          {children}
        </code>
      );
    }

    const isVegaLite =
      typeof className === 'string' && className.includes('language-vega-lite');

    if (isVegaLite) {
      const specJson =
        typeof children === 'string'
          ? children
          : Array.isArray(children)
            ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
            : '';

      return <VegaChart specJson={specJson.trim()} />;
    }

    return (
      <pre
        className={cn(
          'bg-muted/40 text-muted-foreground/90 border-border/40 my-4 overflow-x-auto rounded-xl border p-4 text-[13px]',
          className,
        )}
      >
        <code {...props} className="font-mono leading-relaxed">
          {children}
        </code>
      </pre>
    );
  },
};
