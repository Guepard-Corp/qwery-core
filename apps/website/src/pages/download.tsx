import { Link } from "wouter";
import { ArrowDownToLine, Apple, Download, Monitor, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.svg";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">{children}</div>;
}

const platforms = [
  {
    name: "macOS",
    icon: Apple,
    description: "For macOS 12 Monterey and later",
    downloads: [
      { label: "Apple Silicon", file: "qwery-macos-arm64.dmg", size: "24 MB" },
      { label: "Intel", file: "qwery-macos-x64.dmg", size: "26 MB" },
    ],
    command: "curl -fsSL https://qwery.run/install | bash",
  },
  {
    name: "Windows",
    icon: Monitor,
    description: "For Windows 10 and later",
    downloads: [
      { label: "64-bit Installer", file: "qwery-win-x64.exe", size: "28 MB" },
      { label: "Portable", file: "qwery-win-x64.zip", size: "25 MB" },
    ],
    command: "irm https://qwery.run/install.ps1 | iex",
  },
  {
    name: "Linux",
    icon: Terminal,
    description: "For Ubuntu, Debian, Fedora, and more",
    downloads: [
      { label: "x86_64 (.deb)", file: "qwery-linux-x64.deb", size: "22 MB" },
      { label: "x86_64 (.rpm)", file: "qwery-linux-x64.rpm", size: "22 MB" },
      { label: "ARM64 (.deb)", file: "qwery-linux-arm64.deb", size: "20 MB" },
    ],
    command: "curl -fsSL https://qwery.run/install | bash",
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-download">
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background" data-testid="header-download">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" data-testid="link-download-home">
              <span className="inline-flex cursor-pointer items-center gap-2" data-testid="wrap-download-brand">
                <img src={logoImg} alt="Qwery" className="h-7 w-7" data-testid="logo-image" />
                <span className="font-mono text-sm font-semibold tracking-tight" data-testid="text-download-brand">
                  qwery
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2" data-testid="row-download-actions">
              <a href="/docs/" data-testid="link-download-docs">
                <Button variant="secondary" className="nb-button h-9 bg-card px-3" data-testid="button-download-docs">
                  Docs
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </header>

      <main data-testid="main-download">
        <Container>
          <div className="py-14 sm:py-20">
            <div className="text-center" data-testid="wrap-download-hero">
              <div className="nb-chip inline-flex px-3 py-1 font-mono text-[11px] text-foreground" data-testid="badge-download">
                FREE DOWNLOAD
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-download-title">
                Download Qwery
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground" data-testid="text-download-description">
                Get started with Qwery in seconds. Choose your platform below.
              </p>
            </div>

            <div className="mt-12 space-y-6" data-testid="list-platforms">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <div
                    key={platform.name}
                    className="nb-panel p-6"
                    data-testid={`card-platform-${platform.name.toLowerCase()}`}
                  >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3" data-testid={`header-${platform.name.toLowerCase()}`}>
                          <Icon className="h-6 w-6 text-amber-400" />
                          <h2 className="text-lg font-semibold">{platform.name}</h2>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{platform.description}</p>

                        <div className="mt-4 flex flex-wrap gap-2" data-testid={`downloads-${platform.name.toLowerCase()}`}>
                          {platform.downloads.map((dl) => (
                            <a
                              key={dl.label}
                              href={`https://qwery.run/releases/${dl.file}`}
                              className="nb-button inline-flex items-center gap-2 bg-card px-3 py-2 text-sm font-medium transition hover:bg-card/80"
                              data-testid={`download-${dl.label.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              <Download className="h-4 w-4" />
                              {dl.label}
                              <span className="text-xs text-muted-foreground">({dl.size})</span>
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto sm:min-w-[420px]" data-testid={`shell-${platform.name.toLowerCase()}`}>
                        <div className="text-xs font-medium text-muted-foreground">Or install via shell</div>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 whitespace-nowrap rounded bg-card/50 px-3 py-2 font-mono text-xs">
                            {platform.command}
                          </code>
                          <button
                            type="button"
                            className="nb-button shrink-0 bg-background px-2 py-2 text-xs font-semibold"
                            onClick={() => navigator.clipboard?.writeText(platform.command)}
                            data-testid={`copy-${platform.name.toLowerCase()}`}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center" data-testid="section-package-managers">
              <h3 className="text-lg font-semibold" data-testid="text-pm-title">
                Package managers
              </h3>
              <div className="mx-auto mt-6 max-w-xl">
                <div className="nb-panel p-4" data-testid="card-package-managers">
                  <div className="grid gap-4 text-left sm:grid-cols-3">
                    <div data-testid="option-npm">
                      <div className="text-xs font-medium text-muted-foreground">npm</div>
                      <code className="mt-1 block overflow-x-auto font-mono text-xs">npm i -g qwery</code>
                    </div>
                    <div data-testid="option-brew">
                      <div className="text-xs font-medium text-muted-foreground">Homebrew</div>
                      <code className="mt-1 block overflow-x-auto font-mono text-xs">brew install qwery</code>
                    </div>
                    <div data-testid="option-cargo">
                      <div className="text-xs font-medium text-muted-foreground">Cargo</div>
                      <code className="mt-1 block overflow-x-auto font-mono text-xs">cargo install qwery</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center" data-testid="section-cta">
              <a href="/docs/" data-testid="link-get-started">
                <Button className="nb-button h-10 bg-foreground px-6 text-background" data-testid="button-get-started">
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Get Started
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
