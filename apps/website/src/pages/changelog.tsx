import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.svg";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">{children}</div>;
}

interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    title: string;
    changes: {
      text: string;
      contributor?: string;
    }[];
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "v1.1.48",
    date: "Jan 31, 2026",
    sections: [
      {
        title: "Core",
        changes: [
          { text: "Sync changes" },
          { text: "Allow specifying custom models file path via QWERY_MODELS_PATH environment variable" },
          { text: "Ensure models configuration is not empty before loading" },
          { text: "Make skills invokable as slash commands in the TUI" },
          { text: "Don't follow symbolic links by default in grep and ripgrep operations" },
          { text: "Prevent parallel test runs from contaminating environment variables" },
          { text: "Ensure Mistral ordering fixes also apply to Devstral" },
          { text: "Add Copilot-specific provider to properly handle reasoning tokens", contributor: "@SteffenDE" },
          { text: "Respect QWERY_MODELS_URL environment variable in build process", contributor: "@dbartels" },
          { text: "Use snake_case for thinking parameter with OpenAI-compatible APIs", contributor: "@Chesars" },
          { text: "Bump AI SDK packages" },
          { text: "Ensure ask question tool isn't included when using acp" },
          { text: "Handle redirected statement treesitter node in bash permissions", contributor: "@pschiel" },
          { text: "Remove special case handling for Google Vertex Anthropic provider in response generation", contributor: "@MichaelYochpaz" },
          { text: "Exclude chat models from textVerbosity setting" },
        ],
      },
      {
        title: "Desktop",
        changes: [
          { text: "Revert transitions, spacing, scroll fade, and prompt area updates" },
          { text: "Add session actions tests", contributor: "@neriousy" },
          { text: "Refactored tests and added project tests", contributor: "@neriousy" },
        ],
      },
    ],
  },
  {
    version: "v1.1.47",
    date: "Jan 28, 2026",
    sections: [
      {
        title: "Core",
        changes: [
          { text: "Fixed query engine connection pooling issue" },
          { text: "Improved error messages for invalid connector configurations" },
          { text: "Added support for custom authentication providers", contributor: "@jsmith" },
          { text: "Performance improvements for large result sets" },
        ],
      },
      {
        title: "CLI",
        changes: [
          { text: "New --format flag for output formatting" },
          { text: "Fixed exit codes for scripting compatibility" },
        ],
      },
    ],
  },
  {
    version: "v1.1.46",
    date: "Jan 20, 2026",
    sections: [
      {
        title: "Core",
        changes: [
          { text: "Initial release of composable query engine" },
          { text: "Added connector support for PostgreSQL, MySQL, and SQLite" },
          { text: "Docs-first API design with predictable defaults" },
        ],
      },
    ],
  },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-changelog">
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background" data-testid="header-changelog">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" data-testid="link-changelog-home">
              <span className="inline-flex cursor-pointer items-center gap-2" data-testid="wrap-changelog-brand">
                <img src={logoImg} alt="Qwery" className="h-7 w-7" data-testid="logo-image" />
                <span className="font-mono text-sm font-semibold tracking-tight" data-testid="text-changelog-brand">
                  qwery
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2" data-testid="row-changelog-actions">
              <a href="/docs/" data-testid="link-changelog-docs">
                <Button variant="secondary" className="nb-button h-9 bg-card px-3" data-testid="button-changelog-docs">
                  Docs
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/blog" data-testid="link-changelog-blog">
                <Button
                  className="nb-button h-9 bg-foreground px-3 text-background hover:bg-foreground/90"
                  data-testid="button-changelog-blog"
                >
                  Blog
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      <main data-testid="main-changelog">
        <Container>
          <div className="py-14 sm:py-20">
            <div className="mb-10" data-testid="wrap-changelog-hero">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-changelog-title">
                Changelog
              </h1>
              <p className="mt-2 text-muted-foreground" data-testid="text-changelog-description">
                New updates and improvements to qwery-core
              </p>
            </div>

            <div className="space-y-6" data-testid="list-changelog-entries">
              {changelog.map((entry) => (
                <div
                  key={entry.version}
                  className="nb-panel p-6"
                  data-testid={`card-${entry.version}`}
                >
                  <div className="flex items-center gap-4 border-b border-foreground/20 pb-4" data-testid={`header-${entry.version}`}>
                    <div className="nb-chip px-3 py-1 font-mono text-sm font-semibold" data-testid={`version-${entry.version}`}>
                      {entry.version}
                    </div>
                    <div className="font-mono text-sm text-muted-foreground" data-testid={`date-${entry.version}`}>
                      {entry.date}
                    </div>
                  </div>

                  <div className="mt-5 space-y-6" data-testid={`content-${entry.version}`}>
                    {entry.sections.map((section) => (
                      <div key={section.title} data-testid={`section-${entry.version}-${section.title.toLowerCase()}`}>
                        <h3 className="font-semibold" data-testid={`title-${section.title.toLowerCase()}`}>
                          {section.title}
                        </h3>
                        <ul className="mt-3 space-y-2" data-testid={`list-${section.title.toLowerCase()}`}>
                          {section.changes.map((change, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-sm text-muted-foreground"
                              data-testid={`change-${idx}`}
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                              <span>
                                {change.text}
                                {change.contributor && (
                                  <span className="ml-1 text-muted-foreground/50">({change.contributor})</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
