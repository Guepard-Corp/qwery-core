import * as React from 'react';
import { parseFrontmatter } from './frontmatter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { reportMarkdownComponents } from './report-markdown-components';
import type { ParsedReport, ReportMetadata } from './types';

export function parseReport(content: string): ParsedReport {
  const parsed = parseFrontmatter(content);
  return {
    metadata: parsed.data as ReportMetadata,
    content: parsed.content,
  };
}

type TagBadgeProps = {
  tag: string;
};

function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="bg-primary/8 text-primary/90 border-primary/15 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wider uppercase">
      {tag}
    </span>
  );
}

type ReportHeaderProps = {
  metadata: ReportMetadata;
  className?: string;
};

function ReportHeader({ metadata, className }: ReportHeaderProps) {
  const { title, author, date, tags, summary } = metadata;

  const hasHeader =
    title ?? author ?? date ?? (tags && tags.length > 0) ?? summary;
  if (!hasHeader) return null;

  return (
    <header
      className={cn(
        'relative mb-12 overflow-hidden rounded-2xl',
        'from-muted/40 via-muted/20 bg-gradient-to-br to-transparent',
        'dark:from-muted/30 dark:via-muted/10 dark:to-transparent',
        'border-border/40 border',
        'px-8 py-10',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="relative">
        {tags && tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        {title && (
          <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight [letter-spacing:-0.02em] md:text-5xl">
            {title}
          </h1>
        )}
        {(author ?? date) && (
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {author && (
              <span>
                by{' '}
                <span className="text-foreground/90 font-medium">{author}</span>
              </span>
            )}
            {date && (
              <span className="before:bg-muted-foreground/50 flex items-center gap-1.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:content-['']">
                {date}
              </span>
            )}
          </div>
        )}
        {summary && (
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            {summary}
          </p>
        )}
      </div>
    </header>
  );
}

type ReportRendererProps = {
  content: string;
  className?: string;
};

export function ReportRenderer({ content, className }: ReportRendererProps) {
  const { metadata, content: body } = parseReport(content);

  return (
    <article
      className={cn(
        'mx-auto max-w-3xl px-6 py-10 md:px-10',
        'font-[family-name:var(--font-sans,ui-sans-serif,system-ui,sans-serif)]',
        className,
      )}
    >
      <ReportHeader metadata={metadata} />
      <div className="report-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={reportMarkdownComponents}
        >
          {body}
        </ReactMarkdown>
      </div>
    </article>
  );
}
