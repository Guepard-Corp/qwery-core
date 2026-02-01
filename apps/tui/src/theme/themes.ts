import type { Theme } from './types.ts';
import { defaultTheme } from './default.ts';
import { nordTheme } from './nord.ts';

export const themes: Record<string, Theme> = {
  default: defaultTheme,
  nord: nordTheme,
};

export const defaultThemeId = 'default';
export const themeIds = Object.keys(themes).sort();
