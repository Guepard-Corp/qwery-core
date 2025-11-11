import { useEffect } from 'react';

import type { Preview } from '@storybook/react';
import { ThemeProvider } from 'next-themes';

import '../../../apps/web/styles/global.css';

const ThemeWrapper = ({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: string;
}) => {
  useEffect(() => {
    // Apply theme class to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeProvider
      attribute="class"
      enableSystem={false}
      disableTransitionOnChange
      defaultTheme={theme}
      forcedTheme={theme}
      enableColorScheme={false}
    >
      <div className="min-h-screen w-full p-4">{children}</div>
    </ThemeProvider>
  );
};

const wrapper = (Story: any, context: any) => {
  const theme = context.globals.theme || 'light';

  return (
    <ThemeWrapper theme={theme}>
      <Story />
    </ThemeWrapper>
  );
};

const decorators = [wrapper];

const preview: Preview = {
  decorators,
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
