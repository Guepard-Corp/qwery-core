import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ExternalLink } from 'lucide-react';
import { cn } from '@qwery/ui/utils';

export function DatasourcePublishingGuide({
  isPublished,
  isChecking,
  className,
}: {
  isPublished: boolean | null;
  isChecking?: boolean;
  className?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (isChecking || isPublished === true) {
    return null;
  }

  const steps = [
    'Inside Google Sheets, go to File → Share → Publish to web',
    'Choose the "Embed" tab and select your desired sheet',
    'Click "Publish" and the preview above will refresh',
  ];

  return (
    <div
      className={cn(
        'border-border/60 bg-muted/20 hover:bg-muted/30 overflow-hidden rounded-lg border transition-colors',
        className,
      )}
    >
      <div
        className="cursor-pointer px-4 py-3 select-none"
        onClick={() => setShowDetails(!showDetails)}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <HelpCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="min-w-0">
              <p className="text-foreground text-[13px] leading-none font-semibold">
                Enable Live Preview
              </p>
              <p className="text-muted-foreground mt-1.5 truncate text-[11px]">
                Google Sheets must be &quot;Published to the web&quot; to be
                visualized.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="https://support.google.com/docs/answer/183965"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Official Google Guide"
            >
              <ExternalLink className="size-3.5" />
            </a>
            <div className="text-muted-foreground">
              {showDetails ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="border-border/40 animate-in fade-in slide-in-from-top-1 mt-4 space-y-3 border-t pt-4 duration-200">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-muted-foreground mt-0.5 text-[11px] font-bold opacity-50">
                  0{idx + 1}
                </span>
                <p className="text-foreground text-[12px] leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
