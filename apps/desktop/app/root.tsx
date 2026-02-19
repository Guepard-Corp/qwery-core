import { Links, Meta, Outlet, Scripts, data } from "react-router";
import type { Route } from '~/types/app/+types/root';

import appConfig from '../../web/config/app.config';
import styles from '../../web/styles/global.css?url';
import { cn } from '@qwery/ui/utils';
import { Spinner } from '@qwery/ui/spinner';
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
  const className = getClassName(appConfig.theme);
  const isDark = appConfig.theme === 'dark';
  // Dark theme background: hsl(0 0% 11%) = #1c1c1c
  // Light theme background: hsl(0 0% 100%) = #ffffff
  const bgColor = isDark ? '#1c1c1c' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  
  return (
    <html lang="en" className={className}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{appConfig.title}</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            html { background-color: ${bgColor}; }
            body { 
              background-color: ${bgColor}; 
              color: ${textColor};
              margin: 0;
              padding: 0;
            }
          `
        }} />
        <Meta />
        <Links />
      </head>
      <body 
        className={cn('bg-background min-h-screen overscroll-none antialiased')}
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        <main className="flex min-h-screen flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-8" />
            <p className="text-muted-foreground text-sm font-medium">
              Loading {appConfig.name}...
            </p>
          </div>
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

