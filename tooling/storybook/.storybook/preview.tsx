import type { Preview } from '@storybook/react';
import { ThemeProvider } from 'next-themes';

import '../../../apps/web/styles/global.css';
import { ToolVariantProvider } from '../../../packages/ui/src/qwery/ai/tool-variant-context';

const ThemeWrapper = ({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: string;
}) => {
  return (
    <ThemeProvider
      attribute="class"
      enableSystem
      disableTransitionOnChange
      defaultTheme={theme}
      enableColorScheme={false}
    >
      <div className="min-h-screen w-full p-4">{children}</div>
    </ThemeProvider>
  );
};

const wrapper = (Story: any, context: any) => {
  const theme = context?.globals?.theme ?? 'light';
  return (
    <ThemeWrapper theme={theme}>
      <ToolVariantProvider>
        <Story />
      </ToolVariantProvider>
    </ThemeWrapper>
  );
};

const decorators = [wrapper];

const preview: Preview = {
  decorators,
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Light or dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
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
