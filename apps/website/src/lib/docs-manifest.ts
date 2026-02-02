const docModules = import.meta.glob<string>('../content/docs/*.mdoc', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function pathToSlug(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.mdoc$/, '');
}

export const docSlugs: string[] = Object.keys(docModules).map(pathToSlug);

export function getDocRaw(slug: string): string | null {
  const key = Object.keys(docModules).find((p) => pathToSlug(p) === slug);
  if (!key) return null;
  const mod = docModules[key];
  return typeof mod === 'string'
    ? mod
    : ((mod as { default?: string } | null)?.default ?? null);
}
