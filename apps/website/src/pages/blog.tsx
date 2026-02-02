import { Link } from "wouter";
import { Calendar, ChevronRight, FileText, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.svg";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">{children}</div>;
}

const posts = [
  {
    slug: "hello-qwery-core",
    title: "Hello qwery-core",
    excerpt: "A quick introduction to what qwery-core is and how to think about the product surface.",
    date: "2026-02-02",
    tag: "Announcement",
  },
  {
    slug: "docs-design-system",
    title: "Docs that feel like product",
    excerpt: "How we design documentation layouts that stay clean as content grows.",
    date: "2026-01-22",
    tag: "Design",
  },
  {
    slug: "release-notes-001",
    title: "Release notes #001",
    excerpt: "Small improvements, clarity tweaks, and what’s next.",
    date: "2026-01-10",
    tag: "Changelog",
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-blog">
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background" data-testid="header-blog">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" data-testid="link-blog-home">
              <span className="inline-flex cursor-pointer items-center gap-2" data-testid="wrap-blog-brand">
                <img src={logoImg} alt="Qwery" className="h-7 w-7" data-testid="logo-image" />
                <span className="font-mono text-sm font-semibold tracking-tight" data-testid="text-blog-brand">
                  qwery
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2" data-testid="row-blog-actions">
              <a href="/docs/" data-testid="link-blog-docs">
                <Button variant="secondary" className="nb-button h-9 bg-card px-3" data-testid="button-blog-docs">
                  Docs
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Button
                className="nb-button h-9 bg-foreground px-3 text-background hover:bg-foreground/90"
                data-testid="button-blog-rss"
              >
                <Rss className="mr-2 h-4 w-4" />
                RSS
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <main className="oc-container" data-testid="main-blog">
        <div className="py-14 sm:py-20">
          <div className="max-w-2xl" data-testid="wrap-blog-hero">
            <div className="nb-chip inline-flex px-3 py-1 font-mono text-[11px] text-foreground" data-testid="badge-blog">
              BLOG
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-blog-title">
              Updates, changelogs, and ideas
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-testid="text-blog-description">
              Short notes that keep the product narrative crisp. Replace these with real MD/MDX content later.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-blog-posts">
            {posts.map((p) => (
              <article key={p.slug} className="nb-panel p-5" data-testid={`card-post-${p.slug}`}>
                <div className="flex items-center justify-between gap-3" data-testid={`row-post-meta-${p.slug}`}>
                  <span
                    className="nb-chip px-2 py-1 font-mono text-[10px] text-foreground"
                    data-testid={`badge-post-tag-${p.slug}`}
                  >
                    {p.tag}
                  </span>
                  <span
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                    data-testid={`text-post-date-${p.slug}`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {p.date}
                  </span>
                </div>

                <h2 className="mt-4 text-base font-semibold leading-snug" data-testid={`text-post-title-${p.slug}`}>
                  {p.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-testid={`text-post-excerpt-${p.slug}`}>
                  {p.excerpt}
                </p>

                <div className="mt-5 flex items-center justify-between" data-testid={`row-post-actions-${p.slug}`}>
                  <Button variant="secondary" className="nb-button h-9 bg-card px-3" data-testid={`button-read-post-${p.slug}`}>
                    Read
                    <FileText className="ml-2 h-4 w-4" />
                  </Button>
                  <a
                    href="#"
                    className="font-mono text-xs text-[hsl(var(--brand-primary))] underline-offset-4 hover:underline"
                    data-testid={`link-post-${p.slug}`}
                  >
                    {p.slug}
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14" data-testid="divider-blog">
            <div className="h-px w-full bg-border" />
          </div>
        </div>
      </main>
    </div>
  );
}
