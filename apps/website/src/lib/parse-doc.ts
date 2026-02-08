import * as Markdoc from '@markdoc/markdoc';
import React from 'react';
import { markdocTransformConfig, markdocComponents } from './markdoc-config';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export type DocFrontmatter = {
  title: string;
  description: string;
};

export function parseFrontmatter(raw: string): {
  frontmatter: DocFrontmatter;
  body: string;
} {
  const match = raw.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: { title: 'Documentation', description: '' },
      body: raw,
    };
  }
  const [, yaml, body] = match;
  const frontmatter: DocFrontmatter = {
    title: 'Documentation',
    description: '',
  };
  for (const line of yaml.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key === 'title') frontmatter.title = value;
    if (key === 'description') frontmatter.description = value;
  }
  return { frontmatter, body };
}

export function renderMarkdocToReact(rawBody: string): React.ReactNode {
  const ast = Markdoc.parse(rawBody);
  const content = Markdoc.transform(ast, markdocTransformConfig);
  return Markdoc.renderers.react(content, React, {
    components: markdocComponents,
  });
}
