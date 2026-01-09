/**
 * Web Event Schemas and Constants
 *
 * Defines event types and their expected attributes for web application telemetry
 */

export const WEB_EVENTS = {
  // Page lifecycle
  PAGE_LOAD: 'web.page.load',
  PAGE_VIEW: 'web.page.view',
  PAGE_UNLOAD: 'web.page.unload',

  // User interactions
  UI_BUTTON_CLICK: 'web.ui.button.click',
  UI_LINK_CLICK: 'web.ui.link.click',
  UI_FORM_SUBMIT: 'web.ui.form.submit',
  UI_INPUT_CHANGE: 'web.ui.input.change',
  UI_DROPDOWN_SELECT: 'web.ui.dropdown.select',
  UI_MODAL_OPEN: 'web.ui.modal.open',
  UI_MODAL_CLOSE: 'web.ui.modal.close',

  // Navigation
  NAVIGATION_START: 'web.navigation.start',
  NAVIGATION_COMPLETE: 'web.navigation.complete',

  // API calls
  API_REQUEST_START: 'web.api.request.start',
  API_REQUEST_COMPLETE: 'web.api.request.complete',
  API_REQUEST_ERROR: 'web.api.request.error',

  // Feature usage
  FEATURE_USED: 'web.feature.used',
  FEATURE_VIEWED: 'web.feature.viewed',

  // Errors
  ERROR_JS: 'web.error.js',
  ERROR_NETWORK: 'web.error.network',
  ERROR_RENDER: 'web.error.render',
} as const;

export type WebEventName = (typeof WEB_EVENTS)[keyof typeof WEB_EVENTS];

/**
 * Web Event Attribute Schemas
 */
export interface WebPageAttributes {
  'web.page.path'?: string;
  'web.page.title'?: string;
  'web.page.load_time_ms'?: number;
  'web.page.render_time_ms'?: number;
}

export interface WebUIAttributes {
  'web.ui.element'?: string;
  'web.ui.element_id'?: string;
  'web.ui.element_type'?: string;
  'web.ui.action'?: string;
  'web.ui.value'?: string;
}

export interface WebAPIAttributes {
  'web.api.endpoint'?: string;
  'web.api.method'?: string;
  'web.api.status_code'?: number;
  'web.api.duration_ms'?: number;
  'web.api.error_type'?: string;
}

export interface WebNavigationAttributes {
  'web.navigation.from'?: string;
  'web.navigation.to'?: string;
  'web.navigation.type'?: 'push' | 'replace' | 'pop';
  'web.navigation.duration_ms'?: number;
}

export interface WebFeatureAttributes {
  'web.feature.name'?: string;
  'web.feature.category'?: string;
  'web.feature.action'?: string;
}

export interface WebErrorAttributes {
  'web.error.type'?: string;
  'web.error.message'?: string;
  'web.error.stack'?: string;
  'web.error.url'?: string;
  'web.error.line'?: number;
  'web.error.column'?: number;
}

export interface WebWorkspaceAttributes {
  'web.workspace.user_id'?: string;
  'web.workspace.organization_id'?: string;
  'web.workspace.project_id'?: string;
}

/**
 * Complete web event attributes (union of all attribute types)
 */
export type WebEventAttributes = WebPageAttributes &
  WebUIAttributes &
  WebAPIAttributes &
  WebNavigationAttributes &
  WebFeatureAttributes &
  WebErrorAttributes &
  WebWorkspaceAttributes &
  Record<string, string | number | boolean | undefined>;
