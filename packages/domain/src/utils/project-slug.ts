/**
 * Derives a project slug from a canonical absolute directory path by replacing
 * every OS path separator (and other punctuation) with `-`. This mirrors the
 * per-directory convention used elsewhere (e.g. tooling project folders), so
 * `/Users/jane/work/qwery-core` becomes `-Users-jane-work-qwery-core`.
 *
 * The slug is the resolution key: the current project is found by slugifying
 * `process.cwd()` (canonicalized) and looking it up. The leading `-` encodes
 * the filesystem root and is intentionally kept.
 */
export function projectSlugFromPath(absolutePath: string): string {
  return absolutePath.replace(/[^a-zA-Z0-9_-]/g, '-');
}
