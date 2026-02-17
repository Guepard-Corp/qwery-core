export interface ReportMetadata {
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  summary?: string;
}

export interface ParsedReport {
  metadata: ReportMetadata;
  content: string;
}

export type QueryFn = (
  sql: string,
  options?: { engine?: string },
) => Promise<Record<string, unknown>[]>;
