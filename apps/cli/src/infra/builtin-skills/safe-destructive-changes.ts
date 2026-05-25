// Built-in skill source. Inlined as a string (not imported from a .md) so a
// clean `tsc -b` resolves it and `bun build --compile` bundles it. Uses the
// same frontmatter format as user/workspace skills; parsed by `skills.ts`.
export const safeDestructiveChanges = `---
name: safe-destructive-changes
description: Discipline for running destructive SQL (bulk UPDATE/DELETE, DROP, TRUNCATE, migrations) safely using GFS branches so changes can be reviewed and rolled back.
agent: data
---

# Safe destructive changes

Use this whenever a request implies modifying or removing data or schema in a
way that is hard to undo: bulk \`UPDATE\`/\`DELETE\` without a tight \`WHERE\`,
\`DROP\`, \`TRUNCATE\`, \`ALTER\` that loses columns, or a migration.

## Principle

Never run a destructive statement directly against the live branch. Do it on a
GFS branch first, inspect the result, and only then keep or discard it. GFS
("Git For database Systems") is qwery's git-for-data sandbox — that is exactly
what it is for.

## Workflow

1. **Check state.** Run \`gfs status\` (via the bash tool) to confirm GFS is
   installed and a repository is initialized, and to see the current branch and
   HEAD. If GFS is not available, tell the user and ask how to proceed before
   touching data.
2. **Use the GFS CLI.** Branch / commit / checkout / query all run through the
   \`gfs\` CLI via bash — see the \`use-gfs-cli\` skill for the exact commands
   (\`gfs checkout -b\`, \`gfs commit -m\`, \`gfs query\`, \`gfs checkout <rev>\`).
   There are no separate GFS tools to load.
3. **Branch.** Create a working branch off the current HEAD so the live data
   stays untouched.
4. **Apply.** Run the destructive statement on the new branch.
5. **Verify.** Re-query to confirm the change did what was intended and only
   that: check affected row counts, spot-check sample rows, and look for
   collateral damage (orphaned rows, broken foreign keys, unexpected nulls).
6. **Decide.** If correct, commit the branch (and merge/fast-forward per the
   user's intent). If wrong, discard the branch — the live data was never
   affected.

## Before any irreversible statement

- State the blast radius first: which tables, roughly how many rows, and what
  cannot be recovered.
- Prefer a \`SELECT\` that previews the exact rows a \`DELETE\`/\`UPDATE\` will hit
  before running the mutation.
- Get explicit confirmation for \`DROP\`/\`TRUNCATE\` and for any statement whose
  \`WHERE\` clause you are not fully certain about.

## When GFS is unavailable

If GFS is not installed or not initialized, do not silently fall back to running
destructive SQL on the live database. Surface that the safety sandbox is
missing, point the user to \`gfs.guepard.run/install\`, and confirm how they want
to proceed.
`;
