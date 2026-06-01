// Test helper: strip ANSI styling so assertions run against the visible text
// (AGENTS.md section 5 — Ink components are snapshotted with ANSI stripped).
// The escape is built from a char code to keep a control character out of the
// regex literal (biome lint/suspicious/noControlCharactersInRegex).
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export const plain = (s: string | undefined): string => (s ?? '').replace(ANSI, '');
