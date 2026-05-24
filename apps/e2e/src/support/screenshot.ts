import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Convert from 'ansi-to-html';

/** Where HTML "screenshots" land. Git-ignored; uploadable as a CI artifact. */
const ARTIFACTS_DIR = join(import.meta.dir, '..', '..', 'artifacts');
const REPO_ROOT = join(import.meta.dir, '..', '..', '..', '..');

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ANSI escape sequences requires the ESC control char.
const ANSI_PATTERN = /\[[0-9;]*m/g;

export function stripAnsi(frame: string): string {
  return frame.replace(ANSI_PATTERN, '');
}

/**
 * A stable text view of a frame for snapshotting: ANSI removed, trailing
 * whitespace trimmed per line (terminal padding varies), trailing blank lines
 * dropped. This is what `toMatchSnapshot()` compares — like a Playwright
 * screenshot baseline, but text.
 */
export function normalizeFrame(frame: string): string {
  return stripAnsi(frame)
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/**
 * Embeds JetBrains Mono as a base64 `@font-face` so the HTML renders identically
 * everywhere (no system-font fallback). Best-effort: if the font file isn't
 * found we fall back to a monospace stack — alignment still holds because the
 * browser lays out the `<pre>` on a real monospace grid (the failing of SVG).
 */
function fontFace(): string {
  try {
    const glob = new Bun.Glob('node_modules/**/jetbrains-mono-latin-400-normal.woff2');
    // `dot: true` so the search descends into bun's `.bun` store directory.
    const match = glob.scanSync({ cwd: REPO_ROOT, absolute: true, dot: true }).next().value as
      | string
      | undefined;
    if (!match) return '';
    const b64 = readFileSync(match).toString('base64');
    return `@font-face{font-family:'JetBrains Mono';font-weight:400;font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  } catch {
    return '';
  }
}

// A dark terminal-like palette so ANSI colors look like a real terminal.
const convert = new Convert({
  fg: '#d4d4d4',
  bg: '#1e1e1e',
  newline: false,
  escapeXML: true,
});

/** (Re)build a gallery `index.html` listing every capture with an inline preview. */
function writeGalleryIndex(): void {
  const captures = readdirSync(ARTIFACTS_DIR)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort();
  const cards = captures
    .map(
      (file) => `<figure>
  <figcaption><a href="./${file}" target="_blank">${file.replace(/\.html$/, '')}</a></figcaption>
  <iframe src="./${file}" loading="lazy"></iframe>
</figure>`,
    )
    .join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>qwery TUI — e2e screenshots</title><style>
body{margin:0;background:#111;color:#d4d4d4;font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;}
h1{font-size:18px;font-weight:600;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:24px;}
figure{margin:0;background:#1e1e1e;border:1px solid #333;border-radius:8px;overflow:hidden;}
figcaption{padding:8px 12px;font-size:13px;border-bottom:1px solid #333;}
figcaption a{color:#6cb6ff;text-decoration:none;}
iframe{width:100%;height:420px;border:0;background:#1e1e1e;}
</style></head><body>
<h1>qwery TUI — e2e screenshots (${captures.length})</h1>
<div class="grid">
${cards}
</div></body></html>`;
  writeFileSync(join(ARTIFACTS_DIR, 'index.html'), html);
}

/**
 * Writes the frame as an HTML "screenshot" (ANSI colors preserved, monospace
 * grid faithful) into `apps/e2e/artifacts/<name>.html`, openable in any browser,
 * and refreshes the gallery `index.html`. Returns the normalized text so the
 * caller can also snapshot it.
 */
export function captureFrame(name: string, frame: string): string {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const safeName = name.replace(/[^a-z0-9._-]/gi, '_');
  const body = convert.toHtml(frame);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safeName}</title><style>
${fontFace()}
body{margin:0;background:#1e1e1e;}
pre{margin:0;padding:16px;background:#1e1e1e;color:#d4d4d4;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.3;white-space:pre;}
</style></head><body><pre>${body}</pre></body></html>`;
  writeFileSync(join(ARTIFACTS_DIR, `${safeName}.html`), html);
  writeGalleryIndex();
  return normalizeFrame(frame);
}
