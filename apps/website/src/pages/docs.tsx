import { Link } from 'wouter';
import { ChevronRight, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocContent } from '@/components/DocContent';
import { getDocRaw } from '@/lib/docs-manifest';
import logoImg from '@/assets/logo.svg';

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">{children}</div>
  );
}

const sidebar = [
  {
    group: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs', slug: 'index' },
      {
        title: 'Installation',
        href: '/docs/installation',
        slug: 'installation',
      },
      { title: 'Quickstart', href: '/docs/quickstart', slug: 'quickstart' },
    ],
  },
  {
    group: 'Usage',
    items: [
      {
        title: 'Query engine',
        href: '/docs/query-engine',
        slug: 'query-engine',
      },
      { title: 'Connectors', href: '/docs/connectors', slug: 'connectors' },
      { title: 'Config', href: '/docs/config', slug: 'config' },
    ],
  },
  {
    group: 'For developers',
    items: [
      { title: 'Extensions', href: '/docs/extending-qwery', slug: 'extending-qwery' },
      { title: 'API', href: '/docs/api', slug: 'api' },
      { title: 'Changelog', href: '/changelog', slug: null },
    ],
  },
];

type DocsProps = { params?: { slug?: string } };

export default function Docs({ params = {} }: DocsProps) {
  const slug = params.slug ?? 'index';
  const docExists = getDocRaw(slug) !== null;
  return (
    <div className="bg-background min-h-screen" data-testid="page-docs">
      <header
        className="border-foreground bg-background sticky top-0 z-50 border-b-2"
        data-testid="header-docs"
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" data-testid="link-docs-home">
              <span
                className="inline-flex cursor-pointer items-center gap-2"
                data-testid="wrap-docs-brand"
              >
                <img
                  src={logoImg}
                  alt="Qwery"
                  className="h-7 w-7"
                  data-testid="logo-image"
                />
                <span
                  className="font-mono text-sm font-semibold tracking-tight"
                  data-testid="text-docs-brand"
                >
                  qwery
                </span>
              </span>
            </Link>

            <div
              className="flex items-center gap-2"
              data-testid="row-docs-actions"
            >
              <div
                className="relative hidden sm:block"
                data-testid="wrap-docs-search"
              >
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search docs…"
                  className="nb-input h-9 w-[280px] pl-9"
                  data-testid="input-docs-search"
                />
              </div>
              <Link href="/blog" data-testid="link-docs-blog">
                <Button
                  variant="secondary"
                  className="nb-button bg-card h-9 px-3"
                  data-testid="button-docs-blog"
                >
                  Blog
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://github.com/Guepard-Corp/qwery-core"
                target="_blank"
                rel="noreferrer"
                data-testid="link-github"
              >
                <Button
                  asChild
                  className="nb-button bg-foreground text-background hover:bg-foreground/90 h-9 px-3"
                  data-testid="button-github"
                >
                  <span className="font-mono text-xs">
                    GitHub
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </span>
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="py-10" data-testid="layout-docs">
          <div
            className="flex min-h-[calc(100vh-5rem)] gap-6"
            data-testid="row-docs-layout"
          >
            <aside
              className="hidden w-[280px] shrink-0 lg:block"
              data-testid="aside-docs"
            >
              <div
                className="sticky top-20"
                data-testid="wrap-docs-sidebar-sticky"
              >
                <div className="nb-panel p-4" data-testid="card-docs-sidebar">
                  <div
                    className="text-sm font-semibold"
                    data-testid="text-docs-nav-title"
                  >
                    Documentation
                  </div>
                  <div
                    className="mt-4 space-y-6"
                    data-testid="list-docs-groups"
                  >
                    {sidebar.map((g) => (
                      <div
                        key={g.group}
                        data-testid={`group-docs-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div
                          className="text-muted-foreground text-xs font-medium"
                          data-testid={`text-docs-group-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {g.group}
                        </div>
                        <div
                          className="mt-2 flex flex-col gap-1"
                          data-testid={`list-docs-items-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {g.items.map((it) => {
                            const isActive =
                              it.slug !== null && it.slug === slug;
                            const className = `border-l-2 px-3 py-2 text-sm transition hover:bg-card/40 ${
                              isActive
                                ? 'border-foreground bg-card/40 text-foreground'
                                : 'border-transparent text-foreground/80 hover:border-foreground hover:text-foreground'
                            }`;
                            return it.slug !== null ? (
                              <Link
                                key={it.title}
                                href={it.href}
                                className={className}
                                data-testid={`link-docs-item-${it.title.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {it.title}
                              </Link>
                            ) : (
                              <a
                                key={it.title}
                                href={it.href}
                                className={className}
                                data-testid={`link-docs-item-${it.title.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {it.title}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <article className="min-w-0 flex-1" data-testid="article-docs">
              <div className="lg:hidden" data-testid="panel-docs-mobile-nav">
                <div
                  className="nb-panel p-4"
                  data-testid="card-docs-sidebar-mobile"
                >
                  <div
                    className="text-sm font-semibold"
                    data-testid="text-docs-nav-title-mobile"
                  >
                    Documentation
                  </div>
                  <div
                    className="mt-4 space-y-6"
                    data-testid="list-docs-groups-mobile"
                  >
                    {sidebar.map((g) => (
                      <div
                        key={g.group}
                        data-testid={`group-docs-mobile-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div
                          className="text-muted-foreground text-xs font-medium"
                          data-testid={`text-docs-group-mobile-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {g.group}
                        </div>
                        <div
                          className="mt-2 flex flex-col gap-1"
                          data-testid={`list-docs-items-mobile-${g.group.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {g.items.map((it) => {
                            const isActive =
                              it.slug !== null && it.slug === slug;
                            const className = `border-l-2 px-3 py-2 text-sm transition hover:bg-card/40 ${
                              isActive
                                ? 'border-foreground bg-card/40 text-foreground'
                                : 'border-transparent text-foreground/80 hover:border-foreground hover:text-foreground'
                            }`;
                            return it.slug !== null ? (
                              <Link
                                key={it.title}
                                href={it.href}
                                className={className}
                                data-testid={`link-docs-item-mobile-${it.title.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {it.title}
                              </Link>
                            ) : (
                              <a
                                key={it.title}
                                href={it.href}
                                className={className}
                                data-testid={`link-docs-item-mobile-${it.title.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {it.title}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="nb-panel p-6 sm:p-8"
                data-testid="card-docs-content"
              >
                {docExists ? (
                  <DocContent slug={slug} />
                ) : (
                  <>
                    <h1
                      className="text-3xl font-semibold tracking-tight"
                      data-testid="text-docs-title"
                    >
                      Page not found
                    </h1>
                    <p
                      className="text-muted-foreground mt-3"
                      data-testid="text-docs-lede"
                    >
                      This documentation page does not exist.
                    </p>
                  </>
                )}
                <div
                  className="mt-10 flex flex-col gap-3 sm:flex-row"
                  data-testid="row-docs-cta"
                >
                  <Link href="/" data-testid="link-docs-back">
                    <Button
                      variant="secondary"
                      className="nb-button bg-card h-10 px-4"
                      data-testid="button-docs-back"
                    >
                      Back to home
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </Container>
    </div>
  );
}
