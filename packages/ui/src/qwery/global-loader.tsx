'use client';

import { If } from './if';
import { LoadingOverlay } from './loading-overlay';
import { TopLoadingBarIndicator } from './top-loading-bar-indicator';
import { Trans } from './trans';

export function GlobalLoader({
  children,
  displayLogo = false,
  fullPage = false,
  displaySpinner = true,
  displayTopLoadingBar = true,
}: React.PropsWithChildren<{
  displayLogo?: boolean;
  fullPage?: boolean;
  displaySpinner?: boolean;
  displayTopLoadingBar?: boolean;
}>) {
  const Text = children ?? <Trans i18nKey={'common:loading'} />;

  return (
    <>
      <If condition={displayTopLoadingBar}>
        <TopLoadingBarIndicator />
      </If>

      <If condition={displaySpinner}>
        <div
          className={'flex flex-1 flex-col items-center justify-center py-48'}
        >
          <LoadingOverlay displayLogo={displayLogo} fullPage={fullPage}>
            {Text}
          </LoadingOverlay>

          {children}
        </div>
      </If>
    </>
  );
}
