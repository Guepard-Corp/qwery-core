import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { cn } from '@qwery/ui/utils';

import styles from '../styles/global.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export const meta = () => {
  return [
    {
      title: 'Dev Tools - State Machine Visualizer',
    },
  ];
};

export default function App() {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className={cn('bg-background min-h-screen antialiased')}>
        <ThemeProvider
          attribute="class"
          enableSystem={false}
          defaultTheme="dark"
          forcedTheme="dark"
        >
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
