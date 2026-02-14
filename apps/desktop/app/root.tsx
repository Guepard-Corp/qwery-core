import { Links, Meta, Outlet, Scripts, data } from "react-router";
import type { Route } from '~/types/app/+types/root';

import appConfig from '../../web/config/app.config';
import styles from '../../web/styles/global.css?url';
import { cn } from '@qwery/ui/utils';
import { RootProviders } from '../../web/components/root-providers';

export const links = () => [{ rel: 'stylesheet', href: styles }];

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

export function HydrateFallback() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Loading...</title>
        <Meta />
        <Links />
      </head>
      <body>
        <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
          <p>Loading...</p>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

export async function clientLoader() {
  const theme = await getTheme();
  const className = getClassName(theme);

  return data({
    className,
    theme,
  });
}

export default function App({
  loaderData,
}: Route.ComponentProps) {
  const { className, theme } = loaderData ?? {};

  return (
    <html lang={'en'} className={className}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/images/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/images/favicon/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon/favicon-32x32.png"
        />
        <link
          rel="mask-icon"
          href="/images/favicon/safari-pinned-tab.svg"
          color="#000000"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <RootProviders theme={theme} language={'en'}>
          <Outlet />
        </RootProviders>
        <Scripts />
      </body>
    </html>
  );
}

async function getTheme() {

  return appConfig.theme;
}

