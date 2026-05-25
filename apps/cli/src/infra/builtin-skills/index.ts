import { safeDestructiveChanges } from './safe-destructive-changes';

/**
 * Markdown sources for the skills qwery ships by default. They are inlined as TS
 * string constants (not imported from .md) so a clean `tsc -b` resolves them and
 * `bun build --compile` bundles them into the release binary (there is no source
 * tree on the user's disk at runtime). Each source uses the same frontmatter
 * format as user/workspace skills and is parsed by `skills.ts`.
 *
 * To add a built-in skill: create a `<name>.ts` next to this file exporting the
 * markdown string, and append it here.
 */
export const BUILTIN_SKILL_SOURCES: readonly string[] = [safeDestructiveChanges];
