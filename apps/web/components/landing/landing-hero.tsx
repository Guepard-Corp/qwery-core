import type { ReactNode } from 'react';

import { LogoImage } from '~/components/app-logo';

import { useBrandTypingAnimation } from './use-brand-typing-animation';

type LandingHeroProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
};

export function LandingHero({ title, subtitle }: LandingHeroProps) {
  const { brandText, showCursor } = useBrandTypingAnimation();

  return (
    <section className="mb-16 space-y-5 text-center">
      <div className="mb-8 flex flex-col items-center gap-4">
        <LogoImage size="2xl" _width={256} />
        <span className="text-foreground text-4xl font-black tracking-tighter uppercase">
          {brandText || 'Q'}
          {showCursor && (
            <span className="bg-foreground ml-0.5 inline-block h-8 w-0.5 animate-pulse" />
          )}
        </span>
      </div>
      {title != null && (
        <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
      )}
      {subtitle != null && (
        <p className="text-muted-foreground mx-auto max-w-xl text-base sm:text-lg">
          {subtitle}
        </p>
      )}
    </section>
  );
}
