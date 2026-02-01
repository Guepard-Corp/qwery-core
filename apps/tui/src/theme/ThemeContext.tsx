import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Theme } from './types.ts';
import { themes, defaultThemeId } from './themes.ts';
import { defaultTheme } from './default.ts';
import { getStyles, type Styles } from './getStyles.ts';

interface ThemeContextValue {
  theme: Theme;
  styles: Styles;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  themeId?: string;
}

export function ThemeProvider({
  children,
  themeId = defaultThemeId,
}: ThemeProviderProps) {
  const value = useMemo(() => {
    const theme: Theme =
      themes[themeId] ?? themes[defaultThemeId] ?? defaultTheme;
    const styles = getStyles(theme.colors);
    return { theme, styles };
  }, [themeId]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx.theme;
}

export function useStyles(): Styles {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useStyles must be used within ThemeProvider');
  }
  return ctx.styles;
}
