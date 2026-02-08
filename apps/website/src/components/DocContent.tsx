import { parseFrontmatter, renderMarkdocToReact } from '@/lib/parse-doc';
import { getDocRaw } from '@/lib/docs-manifest';

type DocContentProps = {
  slug: string;
};

export function DocContent({ slug }: DocContentProps) {
  const raw = getDocRaw(slug);
  if (!raw) return null;
  const { frontmatter, body } = parseFrontmatter(raw);
  const content = renderMarkdocToReact(body);
  return (
    <>
      <div
        className="nb-chip text-foreground inline-flex items-center gap-2 px-3 py-1 font-mono text-[11px]"
        data-testid="badge-docs"
      >
        DOCUMENTATION
      </div>
      <h1
        className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        data-testid="text-docs-title"
      >
        {frontmatter.title}
      </h1>
      {frontmatter.description && (
        <p className="text-muted-foreground mt-3" data-testid="text-docs-lede">
          {frontmatter.description}
        </p>
      )}
      <div
        className="mt-8 space-y-4 text-sm leading-relaxed"
        data-testid="docs-content"
      >
        {content}
      </div>
    </>
  );
}
