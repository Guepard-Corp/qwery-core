/**
 * Utility functions for Google Sheets preview and URL conversion
 */

export interface GoogleSheetsUrlInfo {
  sheetId: string;
  gid: string;
  isPublishedUrl: boolean;
}

export type PublicationStatus =
  | 'published'
  | 'not-published'
  | 'checking'
  | 'unknown';

/**
 * Extracts Google Sheets ID and gid from various URL formats
 */
export function parseGoogleSheetsUrl(url: string): GoogleSheetsUrlInfo | null {
  try {
    // Handle URLs that might not have protocol
    let urlToParse = url.trim();
    if (
      !urlToParse.startsWith('http://') &&
      !urlToParse.startsWith('https://')
    ) {
      if (urlToParse.includes('/pub') || urlToParse.match(/^[a-zA-Z0-9-_]+$/)) {
        urlToParse = `https://docs.google.com/spreadsheets/d/${urlToParse}`;
      } else {
        urlToParse = `https://${urlToParse}`;
      }
    }

    const parsedUrl = new URL(urlToParse);

    if (!parsedUrl.hostname.includes('docs.google.com')) {
      return null;
    }

    let sheetId: string | null = null;
    let gid = '0';
    let isPublishedUrl = false;

    // Check for "Published to Web" format first: /d/e/{ID}
    const publishedMatch = parsedUrl.pathname.match(
      /\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]{20,})/,
    );
    if (publishedMatch && publishedMatch[1]) {
      sheetId = publishedMatch[1];
      isPublishedUrl = true;
    }

    // Standard format: /d/{ID}/... (ensure we don't just match 'e' if it's followed by /e/)
    if (!sheetId && parsedUrl.pathname.includes('/spreadsheets/d/')) {
      const match = parsedUrl.pathname.match(
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/,
      );
      if (match && match[1]) {
        sheetId = match[1];
      }
    }

    // Handle pub URLs: /pub?output=ods or /pub?output=csv
    if (!sheetId && parsedUrl.pathname.includes('/pub')) {
      const pubMatch = parsedUrl.pathname.match(/\/([a-zA-Z0-9-_]+)\/pub/);
      if (pubMatch && pubMatch[1]) {
        sheetId = pubMatch[1];
      }
    }

    // Try to extract from the full URL string as fallback
    if (!sheetId) {
      const idMatch2 = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]{20,})/);
      const idMatch1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
      const idMatch3 = url.match(/\/([a-zA-Z0-9-_]{20,})\//);
      const idMatch4 = url.match(/^([a-zA-Z0-9-_]{20,})$/);
      const idMatch = idMatch2 || idMatch1 || idMatch3 || idMatch4;
      if (idMatch && idMatch[1]) {
        sheetId = idMatch[1];
        if (idMatch2) {
          isPublishedUrl = true;
        }
      }
    }

    if (!sheetId) {
      return null;
    }

    // Extract gid from URL (supports both #gid= and &gid= formats)
    const gidMatch = url.match(/[#&]gid=(\d+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }

    return { sheetId, gid, isPublishedUrl };
  } catch {
    // If URL parsing fails, try to extract ID directly from string
    const directIdMatch = url.match(/([a-zA-Z0-9-_]{20,})/);
    if (directIdMatch && directIdMatch[1]) {
      const gidMatch = url.match(/[#&]gid=(\d+)/);
      const gid = gidMatch && gidMatch[1] ? gidMatch[1] : '0';
      return {
        sheetId: directIdMatch[1],
        gid,
        isPublishedUrl: url.includes('/pubhtml') || url.includes('/d/e/'),
      };
    }
  }
  return null;
}

/**
 * Converts a Google Sheets URL to an embeddable pubhtml URL
 */
export function convertGoogleSheetsToEmbedUrl(
  sharedLink: string,
): string | null {
  // If URL already contains /pubhtml, use it as-is (just ensure proper query params)
  if (sharedLink.includes('/pubhtml')) {
    try {
      // Handle URLs that might not have protocol
      let urlToParse = sharedLink.trim();
      if (
        !urlToParse.startsWith('http://') &&
        !urlToParse.startsWith('https://')
      ) {
        urlToParse = `https://${urlToParse}`;
      }

      const url = new URL(urlToParse);

      // Preserve existing query params, but ensure widget and headers are set
      if (!url.searchParams.has('widget')) {
        url.searchParams.set('widget', 'true');
      }
      if (!url.searchParams.has('headers')) {
        url.searchParams.set('headers', 'false');
      }

      // Extract gid from original URL if present (from hash or query)
      const gidMatch = sharedLink.match(/[#&]gid=(\d+)/);
      if (
        gidMatch &&
        gidMatch[1] &&
        gidMatch[1] !== '0' &&
        !url.searchParams.has('gid')
      ) {
        url.searchParams.set('gid', gidMatch[1]);
      } else if (!url.searchParams.has('gid')) {
        url.searchParams.set('gid', '0');
      }

      return url.toString();
    } catch {
      // If URL parsing fails, return as-is (might be a valid URL that just needs protocol)
      if (
        !sharedLink.startsWith('http://') &&
        !sharedLink.startsWith('https://')
      ) {
        return `https://${sharedLink}`;
      }
      return sharedLink;
    }
  }

  const urlInfo = parseGoogleSheetsUrl(sharedLink);
  if (!urlInfo) {
    return null;
  }

  const { sheetId, gid, isPublishedUrl } = urlInfo;

  // Convert standard format to pubhtml
  if (isPublishedUrl) {
    // Format: /d/e/{ID} -> /d/e/{ID}/pubhtml
    return `https://docs.google.com/spreadsheets/d/e/${sheetId}/pubhtml?widget=true&headers=false&gid=${gid}`;
  }

  // Standard format: /d/{ID} -> /d/{ID}/pubhtml
  return `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml?widget=true&headers=false&gid=${gid}`;
}


/**
 * Fast pre-check: detects if URL uses /d/e/ pattern (only generated by "Publish to web")
 */
export function looksPublished(url: string): boolean {
  return /\/spreadsheets\/d\/e\//.test(url);
}

/**
 * Converts a Google Sheets URL to its CSV export endpoint
 */
function toCsvUrl(url: string): string | null {
  try {
    const info = parseGoogleSheetsUrl(url);
    if (!info) return null;

    const { sheetId, gid, isPublishedUrl } = info;

    if (isPublishedUrl) {
      // For /d/e/ URLs, the CSV endpoint is /pub?output=csv
      return `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&single=true&output=csv`;
    }

    // For standard /d/ URLs, the CSV endpoint is /pub?output=csv
    return `https://docs.google.com/spreadsheets/d/${sheetId}/pub?gid=${gid}&single=true&output=csv`;
  } catch {
    return null;
  }
}

/**
 * Checks if a Google Sheet is published by attempting to fetch its CSV export
 * This is the authoritative signal - published sheets can be fetched anonymously
 */
export async function isPublishedGoogleSheet(url: string): Promise<boolean> {
  try {
    const csvUrl = toCsvUrl(url);
    if (!csvUrl) {
      return false;
    }

    const res = await fetch(csvUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache',
    });

    // Published sheets return 200 with CSV content
    if (!res.ok) {
      return false;
    }

    const contentType = res.headers.get('content-type') || '';
    return (
      contentType.includes('text/csv') || contentType.includes('text/plain')
    );
  } catch {
    return false;
  }
}

/**
 * Detects publication status using the recommended production logic:
 * 1. Fast pre-check for /d/e/ pattern
 * 2. Fallback to CSV endpoint check
 */
export async function detectPublishedState(
  url: string,
): Promise<PublicationStatus> {
  if (looksPublished(url)) {
    return 'published';
  }

  const isPublished = await isPublishedGoogleSheet(url);
  return isPublished ? 'published' : 'not-published';
}
