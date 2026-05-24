import { DEFAULT_CONNECTION_TEST_TIMEOUT_MS } from '@qwery/extension-sdk';

/** Builds the CSV-export URL for a given spreadsheet tab. */
export function convertToCsvLink(spreadsheetId: string, gid: number): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid === 0 ? base : `${base}&gid=${gid}`;
}

/** Extracts the spreadsheet id from any Google Sheets URL, or null. */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

/** Extracts a single gid from `?gid=` or `#gid=`, or null. */
export function extractGidFromUrl(url: string): number | null {
  const queryMatch = url.match(/[?&]gid=(\d+)/);
  if (queryMatch?.[1]) return Number.parseInt(queryMatch[1], 10);
  const hashMatch = url.match(/#gid=(\d+)/);
  if (hashMatch?.[1]) return Number.parseInt(hashMatch[1], 10);
  return null;
}

/** Extracts every gid referenced in a URL (query + hash). */
export function extractGidsFromUrl(url: string): number[] {
  const gids: number[] = [];
  const queryMatch = url.match(/[?&]gid=(\d+)/);
  if (queryMatch?.[1]) {
    const gid = Number.parseInt(queryMatch[1], 10);
    if (!Number.isNaN(gid)) gids.push(gid);
  }
  const hashMatch = url.match(/#gid=(\d+)/);
  if (hashMatch?.[1]) {
    const gid = Number.parseInt(hashMatch[1], 10);
    if (!Number.isNaN(gid) && !gids.includes(gid)) gids.push(gid);
  }
  return gids;
}

/** Turns a tab title into a safe SQL identifier. */
export function sanitizeTableName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return /^\d/.test(cleaned) ? `v_${cleaned}` : cleaned;
}

/** Fetches every tab (gid + title) by scraping the spreadsheet HTML. Best-effort. */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
): Promise<Array<{ gid: number; name: string }>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Qwery/1.0)' },
    });
    if (!response.ok) return [];
    const html = await response.text();
    const tabs: Array<{ gid: number; name: string }> = [];
    const regex = /"sheetId":(\d+),"title":"([^"]+)"/g;
    let m: RegExpExecArray | null = regex.exec(html);
    while (m !== null) {
      const gid = Number.parseInt(m[1], 10);
      const name = m[2];
      if (!tabs.some((t) => t.gid === gid)) tabs.push({ gid, name });
      m = regex.exec(html);
    }
    return tabs;
  } catch {
    return [];
  }
}

/** Discovers the first usable gid by scraping the spreadsheet HTML, or null. */
export async function discoverFirstGid(spreadsheetId: string): Promise<number | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONNECTION_TEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Qwery/1.0)' },
      });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const html = await response.text();
      if (!html || html.length < 100) return null;

      const gridContainerMatch = html.match(/id="(\d+)-grid-container"/);
      if (gridContainerMatch?.[1]) {
        const gid = Number.parseInt(gridContainerMatch[1], 10);
        if (!Number.isNaN(gid)) return gid;
      }
      for (const pattern of [/"sheetId":(\d+)/, /'sheetId':(\d+)/, /sheetId["\s]*:["\s]*(\d+)/]) {
        const match = html.match(pattern);
        if (match?.[1]) {
          const gid = Number.parseInt(match[1], 10);
          if (!Number.isNaN(gid)) return gid;
        }
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  } catch {
    return null;
  }
}

/** Resolves the CSV-export URL of the first/target tab of a shared link. */
export async function resolveFirstCsvUrl(sharedLink: string): Promise<string> {
  const spreadsheetId = extractSpreadsheetId(sharedLink);
  if (!spreadsheetId) {
    throw new Error(
      `Invalid Google Sheets link: ${sharedLink}. Expected https://docs.google.com/spreadsheets/d/{id}/...`,
    );
  }
  const gid = extractGidFromUrl(sharedLink) ?? (await discoverFirstGid(spreadsheetId)) ?? 0;
  return convertToCsvLink(spreadsheetId, gid);
}
