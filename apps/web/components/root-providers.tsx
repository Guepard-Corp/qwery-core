import { Suspense, useMemo } from 'react';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';

import { I18nProvider } from '@qwery/i18n/provider';
import { ClientOnly } from '@qwery/ui/client-only';
import { GlobalLoader } from '@qwery/ui/global-loader';
import { Toaster } from '@qwery/ui/sonner';
import {
  AgentStatusProvider,
  ConversationStateManagerProvider,
} from '@qwery/ui/ai';

import { i18nResolver } from '~/lib/i18n/i18n.resolver';
import { getI18nSettings } from '~/lib/i18n/i18n.settings';

import { AgentsProvider } from './agents-provider';
import { GlobalKeyHandler } from './global-key-handler';
import { ReactQueryProvider } from './react-query-provider';
import { WorkspaceProvider } from './workspace-provider';
import { TelemetryProvider } from '@qwery/telemetry';

type Theme = 'light' | 'dark' | 'system';

export function RootProviders(
  props: React.PropsWithChildren<{
    theme?: Theme;
    language?: string;
  }>,
) {
  const settings = useMemo(
    () => getI18nSettings(props.language),
    [props.language],
  );

  return (
    <Suspense>
      <I18nProvider settings={settings} resolver={i18nResolver}>
        <TelemetryProvider>
          <Toaster
            richColors={true}
            theme={props.theme}
            position="top-center"
          />

          <ClientOnly>
            <GlobalLoader displaySpinner={false} />
            <GlobalKeyHandler />
          </ClientOnly>
          <ReactQueryProvider>
            <ReactQueryDevtools initialIsOpen={false} />
            <ThemeProvider
              attribute="class"
              enableSystem
              disableTransitionOnChange
              defaultTheme={props.theme}
              enableColorScheme={false}
            >
              <WorkspaceProvider>
                <AgentStatusProvider>
                  <ConversationStateManagerProvider>
                    <AgentsProvider>{props.children}</AgentsProvider>
                  </ConversationStateManagerProvider>
                </AgentStatusProvider>
              </WorkspaceProvider>
            </ThemeProvider>
          </ReactQueryProvider>
        </TelemetryProvider>
      </I18nProvider>
    </Suspense>
  );
}
