declare module 'papaparse' {
  export interface UnparseConfig {
    columns?: string[];
    header?: boolean;
  }

  export function unparse(
    data: unknown[] | Record<string, unknown>[],
    config?: UnparseConfig,
  ): string;

  const Papa: {
    unparse: typeof unparse;
  };

  export default Papa;
}
