import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowDownToLine, BarChart3, Github, Key, Layers, Lock, MessageCircle, MessageSquare, Newspaper, RefreshCw, ScrollText, Table2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.svg";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      {children}
    </div>
  );
}

function TopNav() {
  return (
    <header className="sticky top-0 z-50" data-testid="header-nav">
      <div className="border-b-2 border-foreground bg-background">
        <div className="oc-container">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" data-testid="link-home">
              <span className="inline-flex cursor-pointer items-center gap-2" data-testid="brand-qwery-core">
                <img src={logoImg} alt="Qwery" className="h-7 w-7" data-testid="logo-image" />
                <span className="font-mono text-sm font-semibold tracking-tight" data-testid="text-brand-name">
                  qwery
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex" data-testid="nav-links">
              <a
                href="https://github.com/Guepard-Corp/qwery-core"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                data-testid="link-github"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a href="/docs/" className="inline-flex cursor-pointer items-center text-sm text-muted-foreground transition hover:text-foreground" data-testid="link-docs">
                Docs
              </a>
              <Link href="/blog" data-testid="link-blogs">
                <span className="inline-flex cursor-pointer items-center text-sm text-muted-foreground transition hover:text-foreground">Blogs</span>
              </Link>

              <Link href="/download" data-testid="link-free-cta">
                <Button
                  variant="secondary"
                  className="nb-button h-9 bg-card px-3 text-foreground"
                  data-testid="button-free-cta"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Free
                </Button>
              </Link>
            </nav>

            <div className="flex items-center gap-2 md:hidden" data-testid="nav-mobile">
              <a href="/docs/" data-testid="button-mobile-docs">
                <Button variant="secondary" className="nb-button h-9 px-3" data-testid="button-mobile-docs-cta">
                  Docs
                </Button>
              </a>
              <Link href="/download" data-testid="link-mobile-free">
                <Button variant="secondary" className="nb-button h-9 px-3" data-testid="button-mobile-free">
                  Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <main className="oc-container" data-testid="main-hero">
      <div className="py-14 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
          data-testid="wrap-hero-copy"
        >
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl" data-testid="text-hero-title">
            <span className="nb-highlight inline-block px-2 py-1">The open source AI data agent</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base" data-testid="text-hero-description">Become data-centric in seconds and not days/months. Connect Qwery to your datasources and get instant insights. Qwery will manage all the hassle of data enginnering for you.</p>

          <div className="mt-10" data-testid="panel-install">
            <div className="nb-panel" data-testid="card-install">
              <div className="flex items-center gap-4 border-b-2 border-foreground/80 px-4 py-3" data-testid="row-install-tabs">
                {["curl", "npm", "bun", "brew"].map((t, idx) => (
                  <button
                    key={t}
                    className={`text-xs font-semibold ${idx === 0 ? "text-foreground" : "text-muted-foreground"}`}
                    data-testid={`tab-install-${t}`}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="px-4 py-4" data-testid="row-install-command">
                <div className="flex items-center justify-between gap-3" data-testid="row-install-inner">
                  <code className="block overflow-x-auto font-mono text-xs text-foreground" data-testid="text-install-command">
                    curl -fsSL https://qwery.run/install | bash
                  </code>
                  <button
                    className="nb-button bg-background px-2 py-1 text-xs font-semibold text-foreground"
                    data-testid="button-copy"
                    type="button"
                    onClick={() => navigator.clipboard?.writeText("curl -fsSL https://qwery.run/install | bash")}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="row-hero-cta">
              <a href="/docs/" data-testid="link-open-docs">
                <Button className="nb-button h-10 bg-foreground px-4 text-background" data-testid="button-open-docs">
                  <ScrollText className="mr-2 h-4 w-4" />
                  Docs
                </Button>
              </a>
              <Link href="/blog" data-testid="link-open-blog">
                <Button variant="secondary" className="nb-button h-10 bg-card px-4" data-testid="button-open-blog">
                  <Newspaper className="mr-2 h-4 w-4" />
                  Blog
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="mt-14" data-testid="divider-hero">
          <div className="h-px w-full bg-border" />
        </div>
      </div>
    </main>
  );
}

function Features() {
  const features = [
    {
      title: "Connect Everything",
      description: "From spreadsheets to databases, datalakes to SaaS - connect anything that produces insights",
      icon: Table2,
    },
    {
      title: "Ask in Natural Language",
      description: "No coding needed. Just ask questions like you're talking to a colleague",
      icon: MessageSquare,
    },
    {
      title: "Multi-LLM Provider",
      description: "Switch between OpenAI, Anthropic, Google, Mistral, and more - use the best model for each task",
      icon: Layers,
    },
    {
      title: "Bring Your Own Key",
      description: "Use your own API keys for full control over costs and usage - no vendor lock-in",
      icon: Key,
    },
    {
      title: "Beautiful Dashboards",
      description: "Get stunning visual reports automatically - no design skills required",
      icon: BarChart3,
    },
    {
      title: "Data is Yours",
      description: "Run locally on your machine - your data never leaves your environment",
      icon: Lock,
    },
  ];

  return (
    <section className="oc-container" data-testid="section-features">
      <div className="py-14 sm:py-20">
        <div className="flex items-end justify-between gap-6" data-testid="row-features-head">
          <div className="max-w-2xl" data-testid="wrap-features-copy">
            <div className="font-mono text-xs text-muted-foreground" data-testid="text-features-kicker">
              FEATURE SHOWCASE
            </div>
            <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="text-features-title">Built for collaboration with Humains</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-testid="text-features-subtitle">
              A tight core with sharp edges: predictable primitives, strong defaults, and a docs experience that feels like the
              product.
            </p>
          </div>

          <div className="hidden sm:flex" data-testid="wrap-features-cta">
            <a href="/docs/" data-testid="link-features-docs">
              <Button className="nb-button h-10 bg-card px-4" data-testid="button-features-docs">
                <ScrollText className="mr-2 h-4 w-4" />
                See docs
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-features">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="nb-panel p-6" data-testid={`card-feature-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="mb-4" data-testid={`icon-feature-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  <Icon className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold leading-snug" data-testid={`text-feature-title-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground" data-testid={`text-feature-desc-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  {f.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 sm:hidden" data-testid="row-features-cta-mobile">
          <a href="/docs/" data-testid="link-features-docs-mobile">
            <Button className="nb-button h-10 w-full bg-card px-4" data-testid="button-features-docs-mobile">
              <ScrollText className="mr-2 h-4 w-4" />
              See docs
            </Button>
          </a>
        </div>

        <div className="mt-14" data-testid="divider-features">
          <div className="h-px w-full bg-border" />
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "What is qwery-core?",
      a: "A core toolkit for building query tooling experiences—CLI, docs, and product surfaces—without forcing a single UI.",
    },
    {
      q: "Is this open source?",
      a: "Yes—this site is a marketing + docs prototype. The exact license and repo structure can be linked from GitHub.",
    },
    {
      q: "Do you provide hosted search for docs?",
      a: "Not in this mockup. We can add a client-side search experience now, or upgrade to a full-stack app for real indexing later.",
    },
    {
      q: "How do I install it?",
      a: "Use the install command on the homepage, or jump into Docs → Installation for package manager options.",
    },
    {
      q: "Is it free?",
      a: "The marketing CTA is ‘Free’ for now. If you want pricing tiers, we can add a simple pricing section next.",
    },
    {
      q: "Can I customize the look and feel?",
      a: "Yes—the idea is to be brandable: swap components, typography, and content while keeping the core primitives stable.",
    },
  ];

  return (
    <section className="oc-container" data-testid="section-faq">
      <div className="py-14 sm:py-20">
        <div className="max-w-2xl" data-testid="wrap-faq-copy">
          <div className="font-mono text-xs text-muted-foreground" data-testid="text-faq-kicker">
            FAQ
          </div>
          <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="text-faq-title">
            Questions, answered
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground" data-testid="text-faq-subtitle">
            Short, direct answers—kept crisp.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2" data-testid="grid-faq">
          {faqs.map((item, idx) => (
            <details
              key={item.q}
              className="nb-panel group p-5"
              data-testid={`faq-item-${idx}`}
            >
              <summary
                className="cursor-pointer list-none select-none"
                data-testid={`faq-question-${idx}`}
              >
                <div className="flex items-center justify-between gap-4" data-testid={`row-faq-question-${idx}`}
                >
                  <span className="text-sm font-semibold" data-testid={`text-faq-question-${idx}`}>{item.q}</span>
                  <span
                    className="nb-button inline-flex h-7 w-7 items-center justify-center bg-background text-xs font-semibold"
                    data-testid={`icon-faq-toggle-${idx}`}
                  >
                    +
                  </span>
                </div>
              </summary>
              <div className="mt-3 border-t-2 border-foreground/80 pt-3" data-testid={`faq-answer-${idx}`}>
                <p className="text-sm leading-relaxed text-muted-foreground" data-testid={`text-faq-answer-${idx}`}>{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-14" data-testid="divider-faq">
          <div className="h-px w-full bg-border" />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-8" data-testid="footer">
      <div className="oc-container">
        <div className="nb-panel" data-testid="card-footer">
          <div className="px-6 py-8" data-testid="section-footer-cta">
            <div className="max-w-xl" data-testid="wrap-footer-copy">
              <div className="text-sm font-semibold text-foreground" data-testid="text-footer-title">
                Be the first to know when we release new products
              </div>
              <div className="mt-2 text-sm text-muted-foreground" data-testid="text-footer-subtitle">
                Join the waitlist for early access.
              </div>

              <div className="mt-6" data-testid="row-footer-form">
                <Button
                  variant="secondary"
                  className="nb-button h-10 bg-card px-4 text-foreground"
                  data-testid="button-footer-subscribe"
                  asChild
                >
                  <a href="mailto:contact@qwery.io?subject=Waitlist" data-testid="link-footer-waitlist">
                    Contact us
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-foreground/80" data-testid="divider-footer" />

          <div className="grid grid-cols-2 sm:grid-cols-4" data-testid="grid-footer-links">
            <a
              href="https://github.com/Guepard-Corp/qwery-core"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 border-t-2 border-foreground/80 px-4 py-5 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:border-t-0 sm:border-r-2 sm:border-foreground/80"
              data-testid="footer-link-github"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="/docs/"
              className="flex cursor-pointer items-center justify-center gap-2 border-t-2 border-foreground/80 px-4 py-5 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:border-t-0 sm:border-r-2 sm:border-foreground/80"
              data-testid="footer-link-docs"
            >
              <ScrollText className="h-4 w-4" />
              Docs
            </a>
            <Link href="/changelog" data-testid="footer-link-changelog">
              <span className="flex cursor-pointer items-center justify-center gap-2 border-t-2 border-foreground/80 px-4 py-5 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:border-t-0 sm:border-r-2 sm:border-foreground/80">
                <Newspaper className="h-4 w-4" />
                Changelog
              </span>
            </Link>
            <a
              href="https://discord.gg/cjXrNgUU"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 border-t-2 border-foreground/80 px-4 py-5 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:border-t-0"
              data-testid="footer-link-discord"
            >
              <MessageCircle className="h-4 w-4" />
              Discord
            </a>
          </div>
        </div>

        <div className="py-8" data-testid="row-footer-meta">
          <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="font-mono" data-testid="text-footer-copyright">
              ©{new Date().getFullYear()} Guepard Inc.
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="row-footer-legal">
              <a href="#" className="hover:text-foreground" data-testid="footer-link-brand">
                Brand
              </a>
              <a href="#" className="hover:text-foreground" data-testid="footer-link-privacy">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground" data-testid="footer-link-terms">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <Shell>
      <TopNav />
      <Hero />
      <Features />
      <FAQ />
      <Footer />
    </Shell>
  );
}
