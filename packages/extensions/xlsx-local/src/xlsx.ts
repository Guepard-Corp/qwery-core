import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/**
 * Reads a single entry from a ZIP archive by name, dependency-free.
 *
 * An `.xlsx` file is a ZIP container; we only need `xl/workbook.xml` to learn
 * the sheet names, so a minimal central-directory reader is enough. Sizes are
 * read from the central directory (authoritative), then the bytes are inflated.
 */
function readZipEntry(buf: Buffer, entryName: string): Buffer | undefined {
  const EOCD_SIGNATURE = 0x06054b50;
  const CENTRAL_DIR_SIGNATURE = 0x02014b50;
  const STORED = 0;

  // The End Of Central Directory record sits at the tail, possibly behind a
  // comment of up to 0xffff bytes — scan backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return undefined;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== CENTRAL_DIR_SIGNATURE) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    if (name === entryName) {
      // The local header repeats name/extra lengths; the payload starts after.
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const raw = buf.subarray(dataStart, dataStart + compressedSize);
      return method === STORED ? Buffer.from(raw) : inflateRawSync(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return undefined;
}

/** Decodes the XML entities that may appear in a sheet name attribute. */
function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

/**
 * Lists the worksheet names of a local `.xlsx` file, in workbook order.
 * Returns an empty array when the file cannot be parsed as a workbook.
 */
export function listSheets(xlsxPath: string): string[] {
  let buf: Buffer;
  try {
    buf = readFileSync(xlsxPath);
  } catch {
    return [];
  }
  const workbook = readZipEntry(buf, 'xl/workbook.xml');
  if (!workbook) return [];

  const xml = workbook.toString('utf8');
  const names: string[] = [];
  const sheetTag = /<sheet\b[^>]*\bname="([^"]*)"/g;
  let match: RegExpExecArray | null = sheetTag.exec(xml);
  while (match !== null) {
    names.push(decodeXmlEntities(match[1]));
    match = sheetTag.exec(xml);
  }
  return names;
}

/** Turns a sheet title into a safe SQL identifier (parity with gsheet-csv). */
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return /^\d/.test(cleaned) ? `v_${cleaned}` : cleaned;
}
