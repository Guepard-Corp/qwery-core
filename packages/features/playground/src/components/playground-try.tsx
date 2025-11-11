import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';

export const PlaygroundTry = ({ onClick }: { onClick: () => void }) => {
  return (
    <div
      className="[background:linear-gradient(45deg,theme(colors.background),theme(colors.card)_50%,theme(colors.background))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.muted/.48)_80%,theme(colors.primary)_86%,theme(colors.primary/.80)_90%,theme(colors.primary)_94%,theme(colors.muted/.48))_border-box] w-full max-w-full [animation:border_4s_linear_infinite] cursor-pointer rounded-2xl border border-transparent p-6 transition-shadow hover:shadow-lg"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-foreground text-lg font-medium">
          <Trans i18nKey="welcome:playgroundTryMessage" />
        </p>
        <Button variant="ghost" size="sm" className="shrink-0">
          Try it →
        </Button>
      </div>
    </div>
  );
};
