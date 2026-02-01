export interface ThemeColors {
  dimGray: string;
  brightGray: string;
  white: string;
  orange: string;
  yellow: string;
  userPromptBg: string;
  loaderDot: string;
  loaderBlockDim: string;
  loaderBlockDimBg: string;
  loaderBlockBright: string;
  loaderBlockBrightBg: string;
  green: string;
  red: string;
  blue: string;
  magenta: string;
  cyan: string;
  chatTitleBg: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}
