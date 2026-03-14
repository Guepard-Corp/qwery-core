/**
 * Resolves a datasource by id, slug, or name and opens its view in a new tab.
 * Used by getSchema UI (datasource names, error cards, minimal table names) and any other link that should open the datasource page.
 */

export interface DatasourceItemLike {
  id: string;
  name?: string;
  slug?: string;
}

function slugify(s: string): string {
  return (
    String(s)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '') || s
  );
}

export function resolveDatasource(
  items: DatasourceItemLike[],
  idOrSlug: string,
  name: string,
): DatasourceItemLike | undefined {
  return (
    items.find((d) => d.id === idOrSlug) ??
    items.find((d) => d.slug === idOrSlug) ??
    items.find(
      (d) =>
        slugify(d.name ?? '') === idOrSlug ||
        slugify(d.slug ?? '') === idOrSlug,
    ) ??
    items.find((d) => d.name === name)
  );
}

/**
 * Resolves the datasource and opens its view URL in a new tab.
 * @param getPath - e.g. createDatasourceViewPath from project.navigation.config
 */
export function openDatasourceInNewTab(
  items: DatasourceItemLike[],
  idOrSlug: string,
  name: string,
  getPath: (slug: string) => string,
): void {
  const ds = resolveDatasource(items, idOrSlug, name);
  if (ds?.slug) {
    const path = getPath(ds.slug);
    openUrlInNewTab(path);
  }
}

/**
 * Opens a relative or absolute URL in a new tab.
 */
export function openUrlInNewTab(pathOrUrl: string): void {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${pathOrUrl}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Resolves the datasource and opens the table view URL in a new tab.
 * @param getTablePath - e.g. createDatasourceTableViewPath(slug, schema, tableName)
 */
export function openTableInNewTab(
  items: DatasourceItemLike[],
  datasourceIdOrSlug: string,
  datasourceName: string,
  schema: string,
  tableName: string,
  getTablePath: (slug: string, schema: string, tableName: string) => string,
): void {
  const ds = resolveDatasource(items, datasourceIdOrSlug, datasourceName);
  if (ds?.slug) {
    const path = getTablePath(ds.slug, schema || 'main', tableName);
    openUrlInNewTab(path);
  }
}
