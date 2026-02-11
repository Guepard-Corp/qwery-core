import * as Markdoc from '@markdoc/markdoc';
import React from 'react';

export const markdocTransformConfig: Markdoc.Config = {
  nodes: {
    ...Markdoc.nodes,
    heading: {
      ...Markdoc.nodes.heading,
      render: 'Heading',
    },
    fence: {
      ...Markdoc.nodes.fence,
      render: 'Fence',
    },
    link: {
      ...Markdoc.nodes.link,
      render: 'DocLink',
    },
  },
};

const HEADING_TAGS = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
} as const;

export const markdocComponents: Record<
  string,
  React.ComponentType<Record<string, unknown>>
> = {
  Heading: ({
    level,
    id,
    children,
  }: {
    level?: number;
    id?: string;
    children?: React.ReactNode;
  }) => {
    const tag =
      HEADING_TAGS[
        Math.min(Number(level) || 2, 6) as keyof typeof HEADING_TAGS
      ] ?? 'h2';
    return React.createElement(
      tag,
      { id, className: 'scroll-mt-20 font-semibold tracking-tight' },
      children,
    );
  },
  Fence: ({
    language,
    content,
    children,
  }: {
    language?: string;
    content?: string;
    children?: React.ReactNode;
  }) => (
    <div className="nb-panel my-4 overflow-hidden rounded-lg border">
      {language && (
        <div className="bg-muted/50 text-muted-foreground border-b px-4 py-2 font-mono text-xs">
          {language}
        </div>
      )}
      <pre
        className="overflow-auto p-4 font-mono text-xs"
        data-testid="pre-docs-code"
      >
        <code>{children ?? content}</code>
      </pre>
    </div>
  ),
  DocLink: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => {
    if (href?.startsWith('http')) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer text-primary underline hover:no-underline"
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} className="cursor-pointer text-primary underline hover:no-underline">
        {children}
      </a>
    );
  },
};
