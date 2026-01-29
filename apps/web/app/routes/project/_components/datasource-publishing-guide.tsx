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
        'border-border/60 bg-muted/20 overflow-hidden rounded-lg border transition-colors hover:bg-muted/30',
        className,
      )}
    >
      <div
        className="cursor-pointer select-none px-4 py-3"
        onClick={() => setShowDetails(!showDetails)}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <HelpCircle className="text-amber-600 dark:text-amber-500 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground text-[13px] font-semibold leading-none">
                Enable Live Preview
              </p>
              <p className="text-muted-foreground mt-1.5 truncate text-[11px]">
                Google Sheets must be "Published to the web" to be visualized.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://support.google.com/docs/answer/183965"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
          <div className="mt-4 space-y-3 border-t border-border/40 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
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
