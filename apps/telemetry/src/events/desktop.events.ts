/**
 * Desktop Event Schemas and Constants
 * 
 * Defines event types and their expected attributes for desktop application telemetry
 */

export const DESKTOP_EVENTS = {
  // Window lifecycle
  WINDOW_OPEN: 'desktop.window.open',
  WINDOW_CLOSE: 'desktop.window.close',
  WINDOW_MINIMIZE: 'desktop.window.minimize',
  WINDOW_MAXIMIZE: 'desktop.window.maximize',
  WINDOW_RESTORE: 'desktop.window.restore',

  // Menu actions
  MENU_ACTION: 'desktop.menu.action',
  MENU_FILE_NEW: 'desktop.menu.file.new',
  MENU_FILE_OPEN: 'desktop.menu.file.open',
  MENU_FILE_SAVE: 'desktop.menu.file.save',
  MENU_EDIT_UNDO: 'desktop.menu.edit.undo',
  MENU_EDIT_REDO: 'desktop.menu.edit.redo',

  // Command execution
  COMMAND_START: 'desktop.command.start',
  COMMAND_COMPLETE: 'desktop.command.complete',
  COMMAND_ERROR: 'desktop.command.error',

  // User interactions
  UI_BUTTON_CLICK: 'desktop.ui.button.click',
  UI_MENU_CLICK: 'desktop.ui.menu.click',
  UI_SHORTCUT: 'desktop.ui.shortcut',
  UI_DIALOG_OPEN: 'desktop.ui.dialog.open',
  UI_DIALOG_CLOSE: 'desktop.ui.dialog.close',

  // File operations
  FILE_OPEN: 'desktop.file.open',
  FILE_SAVE: 'desktop.file.save',
  FILE_EXPORT: 'desktop.file.export',
  FILE_IMPORT: 'desktop.file.import',

  // Errors
  ERROR_ELECTRON: 'desktop.error.electron',
  ERROR_RENDERER: 'desktop.error.renderer',
  ERROR_MAIN: 'desktop.error.main',
} as const;

export type DesktopEventName = typeof DESKTOP_EVENTS[keyof typeof DESKTOP_EVENTS];

/**
 * Desktop Event Attribute Schemas
 */
export interface DesktopWindowAttributes {
  'desktop.window.id'?: string;
  'desktop.window.title'?: string;
  'desktop.window.type'?: string;
  'desktop.window.state'?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
}

export interface DesktopMenuAttributes {
  'desktop.menu.id'?: string;
  'desktop.menu.label'?: string;
  'desktop.menu.role'?: string;
  'desktop.menu.accelerator'?: string;
}

export interface DesktopCommandAttributes {
  'desktop.command.name'?: string;
  'desktop.command.id'?: string;
  'desktop.command.duration_ms'?: number;
  'desktop.command.status'?: 'success' | 'error';
}

export interface DesktopUIAttributes {
  'desktop.ui.element'?: string;
  'desktop.ui.element_id'?: string;
  'desktop.ui.action'?: string;
  'desktop.ui.shortcut'?: string;
}

export interface DesktopFileAttributes {
  'desktop.file.path'?: string;
  'desktop.file.name'?: string;
  'desktop.file.type'?: string;
  'desktop.file.size_bytes'?: number;
}

export interface DesktopErrorAttributes {
  'desktop.error.type'?: string;
  'desktop.error.message'?: string;
  'desktop.error.stack'?: string;
  'desktop.error.process'?: 'main' | 'renderer';
}

export interface DesktopWorkspaceAttributes {
  'desktop.workspace.user_id'?: string;
  'desktop.workspace.organization_id'?: string;
  'desktop.workspace.project_id'?: string;
}

/**
 * Complete desktop event attributes (union of all attribute types)
 */
export type DesktopEventAttributes = DesktopWindowAttributes &
  DesktopMenuAttributes &
  DesktopCommandAttributes &
  DesktopUIAttributes &
  DesktopFileAttributes &
  DesktopErrorAttributes &
  DesktopWorkspaceAttributes &
  Record<string, string | number | boolean | undefined>;

