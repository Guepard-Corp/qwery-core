import { useCallback, useEffect, useState } from 'react';
import { Links, Meta, Outlet, Scripts, data, useLocation, useNavigate } from "react-router";

import appConfig from '../../web/config/app.config';
import styles from '../../web/styles/global.css?url';
import { cn } from '@qwery/ui/utils';
import { Spinner } from '@qwery/ui/spinner';
import { RootProviders } from '../../web/components/root-providers';
import { Titlebar } from './components/titlebar';
import { StatusBar } from './components/status-bar';
import { initDesktopApi } from './lib/desktop-api';
import { useMenuActions, type MenuActionId } from './hooks/use-menu-actions';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';

import desktopStyles from './styles/desktop.css?url';
import { isDesktopApp } from '@qwery/shared/desktop';

export const links = () => [
  { rel: 'stylesheet', href: styles },
  { rel: 'stylesheet', href: desktopStyles },
];

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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
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

function AppContent({
  className,
  theme,
}: {
  className?: string;
  theme?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!isDesktopApp()) return;

    initDesktopApi();
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('desktop-runtime');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }

    const historyState = window.history.state as { idx?: number } | null;
    const idx =
      historyState && typeof historyState.idx === 'number'
        ? historyState.idx
        : 0;
    const length = window.history.length;

    setCanGoBack(idx > 0);
    setCanGoForward(idx < length - 1);
  }, [location.key]);

  const handleMenuAction = useCallback(
    (action: MenuActionId) => {
      switch (action) {
        case 'file_new':
        case 'file_open':
        case 'file_save':
        case 'file_save_as':
        case 'edit_undo':
        case 'edit_redo':
        case 'help_about':
          break;
        case 'view_zoom_in':
          setZoom((value) => Math.min(1.5, value + 0.1));
          break;
        case 'view_zoom_out':
          setZoom((value) => Math.max(0.5, value - 0.1));
          break;
        case 'view_actual_size':
          setZoom(1);
          break;
        default:
          break;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isDesktopApp()) return;
    if (typeof window === 'undefined' || !('visualViewport' in window)) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportResize = () => {
      const scale = viewport.scale ?? 1;
      if (scale !== 1) {
        document.documentElement.classList.add('visual-zoomed');
      } else {
        document.documentElement.classList.remove('visual-zoomed');
      }
    };

    viewport.addEventListener('resize', handleViewportResize);
    handleViewportResize();

    return () => {
      viewport.removeEventListener('resize', handleViewportResize);
      document.documentElement.classList.remove('visual-zoomed');
    };
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) return;

    const preventZoomWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const preventZoomKeys = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key) {
        case '=': // Ctrl/Cmd + '+'
        case '+':
          e.preventDefault();
          handleMenuAction('view_zoom_in');
          break;
        case '-':
          e.preventDefault();
          handleMenuAction('view_zoom_out');
          break;
        case '0':
          e.preventDefault();
          handleMenuAction('view_actual_size');
          break;
        default:
          break;
      }
    };
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    let cancelled = false;

    import('@tauri-apps/plugin-os')
      .then(({ platform }) => platform())
      .then((p) => {
        if (cancelled) return;

        document.documentElement.classList.add(`platform-${p}`);

        // Common: block Ctrl/Cmd + wheel and remap keyboard zoom to our handler
        document.addEventListener('wheel', preventZoomWheel, { passive: false });
        window.addEventListener('wheel', preventZoomWheel, { passive: false });
        document.addEventListener('keydown', preventZoomKeys);

        // Full lock (where supported): block gesture events on macOS/Windows
        if (p === 'macos' || p === 'windows') {
          document.addEventListener('gesturestart', preventGesture);
          document.addEventListener('gesturechange', preventGesture);
          document.addEventListener('gestureend', preventGesture);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      document.removeEventListener('wheel', preventZoomWheel);
      window.removeEventListener('wheel', preventZoomWheel);
      document.removeEventListener('keydown', preventZoomKeys);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, [handleMenuAction]);

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    navigate(-1);
  }, [canGoBack, navigate]);

  const handleForward = useCallback(() => {
    if (!canGoForward) return;
    navigate(1);
  }, [canGoForward, navigate]);

  const handleOpenSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  useMenuActions(handleMenuAction);
  const onOpenCommandPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);
  useKeyboardShortcuts({ onOpenCommandPalette });

  const canZoomIn = zoom < 1.5;
  const canZoomOut = zoom > 0.5;

  return (
    <>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <Titlebar
          onMenuAction={handleMenuAction}
          onBack={handleBack}
          onForward={handleForward}
          onOpenSettings={handleOpenSettings}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
        <div className="desktop-content-area flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{ zoom }}
          >
            <RootProviders theme={theme as 'light' | 'dark' | 'system' | undefined} language={'en'}>
              <Outlet />
            </RootProviders>
          </div>
        </div>
        <StatusBar zoom={zoom} />
      </div>
    </>
  );
}

type RootLoaderData = { className?: string; theme?: string };

export default function App({
  loaderData,
}: { loaderData?: RootLoaderData }) {
  const { className, theme } = loaderData ?? {};

  return (
    <html lang={'en'} className={cn(className, 'desktop-app')}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
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
      <body className="overflow-hidden">
        <AppContent className={className} theme={theme} />
        <Scripts />
      </body>
    </html>
  );
}

async function getTheme() {

  return appConfig.theme;
}

