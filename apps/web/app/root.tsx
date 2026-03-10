import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  isRouteErrorResponse,
  useRouteError,
  useRouteLoaderData,
} from 'react-router';

import { z } from 'zod';

import { CsrfTokenMeta } from '@qwery/csrf/client';
import { createCsrfProtect } from '@qwery/csrf/server';
import { cn } from '@qwery/ui/utils';

import { RootHead } from '~/components/root-head';
import { RootProviders } from '~/components/root-providers';
import appConfig from '~/config/app.config';
import { themeCookie } from '~/lib/cookies';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import type { Route } from '~/types/app/+types/root';
import NotFoundPage from './routes/404';
import { Trans } from '@qwery/ui/trans';

import styles from '../styles/global.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const csrfProtect = createCsrfProtect();

export const meta = () => {
  return [
    {
      title: appConfig.title,
    },
  ];
};

function getClassName(theme?: string) {
  const dark = theme === 'dark';
  const light = !dark;

  return cn('bg-background min-h-screen overscroll-none antialiased', {
    dark,
    light,
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const [i18n, theme, csrfToken] = await Promise.all([
    createI18nServerInstance(request),
    getTheme(request),
    csrfProtect(request),
  ]);

  const { language } = i18n;
  const className = getClassName(theme);

  return data(
    {
      language,
      className,
      theme,
      csrfToken,
    },
    {
      headers: request.headers,
    },
  );
}

type Theme = 'light' | 'dark' | 'system';

type RootLoaderData = {
  language: string;
  className: string;
  theme: Theme;
  csrfToken: string;
};

export default function App(props: Route.ComponentProps) {
  const { language, className, theme, csrfToken } = (props.loaderData as
    | RootLoaderData
    | undefined) ?? {
    language: 'en',
    className: getClassName('light'),
    theme: 'light',
    csrfToken: '',
  };

  return (
    <html lang={language} className={className}>
      <head>
        <RootHead />
        <Meta />
        <Links />
        <CsrfTokenMeta csrf={csrfToken} />
      </head>
      <body>
        <RootProviders theme={theme} language={language}>
          <Outlet />
        </RootProviders>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary(_props: Route.ErrorBoundaryProps) {
  const error = useRouteError();
  const loaderData = (useRouteLoaderData('root') as
    | RootLoaderData
    | undefined) ?? {
    language: 'en',
    className: getClassName('light'),
    theme: 'light' as Theme,
    csrfToken: '',
  };

  const { language, className, theme, csrfToken } = loaderData;

  return (
    <html lang={language} className={className}>
      <head>
        <RootHead />
        <Meta />
        <Links />
        <CsrfTokenMeta csrf={csrfToken} />
      </head>
      <body>
        <RootProviders theme={theme} language={language}>
          {isRouteErrorResponse(error) && error.status === 404 ? (
            <NotFoundPage />
          ) : (
            <div className="flex min-h-screen flex-1 flex-col items-center justify-center">
              <h1 className="mb-2 text-2xl font-bold">
                <Trans i18nKey="common:errorPageHeading" />
              </h1>
              <p className="text-muted-foreground text-sm">
                <Trans i18nKey="common:genericErrorSubHeading" />
              </p>
            </div>
          )}
        </RootProviders>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

async function getTheme(request: Request) {
  const cookie = request.headers.get('Cookie');
  const theme = await themeCookie.parse(cookie);

  if (Object.keys(theme ?? {}).length === 0) {
    return appConfig.theme;
  }

  const parsed = z.enum(['light', 'dark', 'system']).safeParse(theme);

  if (parsed.success) {
    return parsed.data;
  }

  return appConfig.theme;
}
