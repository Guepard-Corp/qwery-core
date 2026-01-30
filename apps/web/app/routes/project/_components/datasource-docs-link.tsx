import type { DatasourceFormConfigPayload } from '@qwery/extensions-sdk';
import { ExternalLink } from 'lucide-react';

import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import { getDocsUrl } from '~/lib/utils/datasource-form-config';

export function DatasourceDocsLink({
  extensionId,
  formConfig,
  className,
  iconOnly = false,
}: {
  extensionId: string;
  formConfig?: DatasourceFormConfigPayload | null;
  className?: string;
  iconOnly?: boolean;
}) {
  const docsUrl = formConfig?.docsUrl ?? getDocsUrl(extensionId);
  if (!docsUrl) return null;

  if (iconOnly) {
    return (
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors',
          className,
        )}
        aria-label="Documentation"
      >
        <ExternalLink className="size-4" aria-hidden />
      </a>
    );
  }

  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-1.5 text-xs',
        className,
      )}
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-2 transition-colors"
      >
        <Trans i18nKey="datasources:docsLink" />
      </a>
    </div>
  );
}
