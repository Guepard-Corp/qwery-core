/**
 * Form config that each datasource extension declares in contributes.datasources[].formConfig.
 * Used by the frontend to display placeholders, labels, docs link, and to pick validation/normalize preset.
 */
export type ConnectionFieldKind =
  | 'connectionString'
  | 'apiKey'
  | 'sharedLink'
  | 'fileUrl';

export type FormConfigPreset =
  | 'sql'
  | 'apiKey'
  | 'fileUrl'
  | 'sharedLink'
  | 'embeddable';

export interface DatasourceFormConfigPayload {
  preset: FormConfigPreset;
  docsUrl?: string | null;
  defaultHost?: string | null;
  defaultPort?: string | null;
  connectionFieldKind?: ConnectionFieldKind;
  showDetailsTab?: boolean;
  showConnectionStringTab?: boolean;
  placeholders?: Partial<{
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    connectionString: string;
  }>;
  fieldLabels?: Partial<{
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
    connectionString: string;
  }>;
  normalizedKey?: string;
  acceptedKeys?: string[];
  /** When true, shows an "SSL enabled" toggle in the connection form (e.g. PostgreSQL, MySQL). */
  showSslToggle?: boolean;
  /** When true, indicates this datasource supports preview functionality via iframe embedding (e.g. Google Sheets, JSON Online, Parquet Online). */
  supportsPreview?: boolean;
}
