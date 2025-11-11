import type { PropsWithChildren } from 'react';

import { cn } from '../lib/utils';
import { Spinner } from './spinner';

export function LoadingOverlay({
  children,
  className,
  fullPage = true,
  spinnerClassName,
}: PropsWithChildren<{
  className?: string;
  spinnerClassName?: string;
  fullPage?: boolean;
  displayLogo?: boolean;
}>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4',
        className,
        {
          [`bg-background fixed top-0 left-0 z-[100] h-screen w-screen`]:
            fullPage,
        },
      )}
    >
      <Spinner className={spinnerClassName} />

      <div className={'text-muted-foreground text-sm'}>{children}</div>
    </div>
  );
}
