import { useEffect, useState, useMemo } from 'react';

import { Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  Database,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  Zap,
} from 'lucide-react';

import {
  LandingFeatureCard,
  LandingHero,
  LandingSectionDivider,
} from '~/components/landing';
import { useWorkspace } from '~/lib/context/workspace-context';
import pathsConfig from '~/config/paths.config';
import { Button } from '@qwery/ui/button';

const FEATURE_CARDS = [
  {
    icon: MessageSquareText,
    title: 'AI-Powered Chat',
    description:
      'Ask questions about your data in natural language and get instant SQL queries, visualizations, and insights.',
  },
  {
    icon: Database,
    title: 'Multi-Source Connectivity',
    description:
      'Connect to PostgreSQL, MySQL, ClickHouse, Google Sheets, CSV files, and 100+ more data sources.',
  },
  {
    icon: NotebookPen,
    title: 'SQL Notebooks',
    description:
      'Build interactive notebooks to query, analyze, and visualize data. Organize workflows into cells.',
  },
  {
    icon: Zap,
    title: 'Instant Playground',
    description:
      'Try Qwery instantly with built-in sample databases. No setup needed — start exploring in seconds.',
  },
];

function LandingPage({
  username,
  isAnonymous,
}: {
  username?: string;
  isAnonymous: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const greeting = useMemo(() => {
    if (isAnonymous || !username) return null;
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [isAnonymous, username]);

  const title =
    greeting && username ? (
      <span data-test="welcome-message">
        {greeting}, {username}
      </span>
    ) : (
      <span data-test="hero-title">Your data, one question away</span>
    );

  const subtitle = isAnonymous
    ? 'Connect a workspace to unlock the full power of Qwery — AI-driven data analytics, notebooks, and more.'
    : 'Create or select a project to start exploring your data with AI-powered analytics.';

  return (
    <div className="bg-background h-full overflow-y-auto">
      <main
        className={`mx-auto max-w-4xl px-4 py-12 transition-all duration-700 ease-out sm:px-6 sm:py-20 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <LandingHero title={title} subtitle={subtitle} />

        <section className="mb-12 flex flex-col items-center gap-4">
          <Link to={pathsConfig.app.organizations}>
            <Button
              className="h-12 cursor-pointer bg-[#ffcb51] px-8 text-base font-bold text-black shadow-md transition-all hover:bg-[#ffcb51]/90 hover:shadow-lg"
              data-test="get-started-button"
            >
              <Sparkles className="mr-2 size-5" />
              {isAnonymous ? 'Get Started' : 'Go to Organizations'}
            </Button>
          </Link>
          <p className="text-muted-foreground/60 text-xs">
            {isAnonymous
              ? 'No credit card required · Free playground included'
              : 'Select or create an organization to begin'}
          </p>
        </section>

        <LandingSectionDivider label="What you can do" />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURE_CARDS.map((card) => (
            <LandingFeatureCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              description={card.description}
            />
          ))}
        </section>

        <LandingSectionDivider label="Get started now" />

        <section className="space-y-4 pb-12">
          <Link to={pathsConfig.app.organizations} className="block">
            <div className="[background:linear-gradient(45deg,theme(colors.background),theme(colors.card)_50%,theme(colors.background))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.muted/.48)_80%,theme(colors.primary)_86%,theme(colors.primary/.80)_90%,theme(colors.primary)_94%,theme(colors.muted/.48))_border-box] w-full max-w-full [animation:border_4s_linear_infinite] cursor-pointer rounded-2xl border border-transparent p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-5 text-[#ffcb51]" />
                  <p className="text-foreground text-lg font-medium">
                    {isAnonymous
                      ? 'Start your data journey with Qwery'
                      : 'Continue to your organizations'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0">
                  Let&apos;s go
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}

export default function IndexPage() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const slug = localStorage.getItem('qwery:last-project-slug');
      const lastUsedRaw = localStorage.getItem('qwery:last-project-used-at');

      if (!slug || !lastUsedRaw) return;

      const lastUsed = Number.parseInt(lastUsedRaw, 10);
      if (Number.isNaN(lastUsed)) return;

      const RECENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
      if (Date.now() - lastUsed <= RECENT_THRESHOLD_MS) {
        navigate(`/prj/${slug}`, { replace: true });
      }
    } catch {
      // ignore localStorage errors
    }
  }, [navigate]);

  return (
    <LandingPage
      username={workspace.username}
      isAnonymous={workspace.isAnonymous === true}
    />
  );
}
