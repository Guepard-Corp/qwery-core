import { TextAttributes } from '@opentui/core';
import type { ThemeColors } from './types.ts';

export function getStyles(colors: ThemeColors) {
  return {
    colors,
    logoDim: { fg: colors.brightGray },
    logoBright: { fg: colors.white, attributes: TextAttributes.BOLD },
    placeholderStyle: { fg: colors.dimGray },
    cursorStyle: { fg: colors.white },
    inputContainerStyle: {
      border: true as const,
      borderStyle: 'rounded' as const,
    },
    inputBorderColorQuery: colors.blue,
    inputBorderColorAsk: colors.orange,
    menuSelectedStyle: { fg: colors.orange },
    keyStyle: { fg: colors.white, attributes: TextAttributes.BOLD },
    keyDescStyle: { fg: colors.dimGray },
    tipDotStyle: { fg: colors.yellow },
    tipLabelStyle: { fg: colors.yellow },
    tipTextStyle: { fg: colors.dimGray },
    tipHighlightStyle: {
      fg: colors.white,
      attributes: TextAttributes.BOLD,
    },
    statusBarStyle: { fg: colors.dimGray },
    commandPaletteTitleStyle: {
      fg: colors.white,
      attributes: TextAttributes.BOLD,
    },
    commandPaletteSearchStyle: { fg: colors.dimGray },
    commandPaletteCategoryStyle: { fg: colors.orange },
    commandPaletteItemStyle: { fg: colors.white },
    commandPaletteItemSelectedStyle: {
      fg: colors.chatTitleBg,
      bg: colors.orange,
    },
    commandPaletteShortcutStyle: { fg: colors.dimGray },
    userPromptStyle: { fg: colors.white, bg: colors.userPromptBg },
    toolCallPrefixStyle: { fg: colors.dimGray },
    toolCallNameStyle: { fg: colors.cyan },
    toolCallUrlStyle: { fg: colors.blue },
    messageInfoStyle: { fg: colors.dimGray },
    modelNameStyle: { fg: colors.orange },
    chatTitleStyle: {
      fg: colors.white,
      attributes: TextAttributes.BOLD,
    },
    greenTextStyle: {
      fg: colors.green,
      attributes: TextAttributes.BOLD,
    },
    redTextStyle: {
      fg: colors.red,
      attributes: TextAttributes.BOLD,
    },
    yellowTextStyle: {
      fg: colors.yellow,
      attributes: TextAttributes.BOLD,
    },
    magentaTextStyle: { fg: colors.magenta },
    statusDotStyle: { fg: colors.blue },
    chatInputContainerStyle: {
      border: true as const,
      borderColor: colors.dimGray,
      borderStyle: 'rounded' as const,
    },
    loaderDotStyle: { fg: colors.loaderDot },
    loaderBlockDimStyle: {
      fg: colors.loaderBlockDim,
      bg: colors.loaderBlockDimBg,
    },
    loaderBlockBrightStyle: {
      fg: colors.loaderBlockBright,
      bg: colors.loaderBlockBrightBg,
    },
    loaderEscStyle: {
      fg: colors.white,
      attributes: TextAttributes.BOLD,
    },
    loaderInterruptStyle: { fg: colors.dimGray },
  };
}

export type Styles = ReturnType<typeof getStyles>;
