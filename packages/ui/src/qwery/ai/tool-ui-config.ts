/**
 * Global configuration for tool call UI
 *
 * To change tool call behavior globally, modify the values below:
 * - DEFAULT_OPEN: Set to true to have tool calls open by default, false to have them closed
 * - MAX_WIDTH: Set the maximum width of tool calls (e.g., 'max-w-2xl', 'max-w-3xl', 'max-w-full')
 */
export const TOOL_UI_CONFIG = {
  /**
   * Whether tool calls should be open by default
   * Set to true to open tool calls by default, false to keep them closed
   */
  DEFAULT_OPEN: false,

  /**
   * Maximum width for tool call UI components
   * Options: 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-full', etc.
   */
  MAX_WIDTH: 'max-w-3xl' as const,
} as const;
