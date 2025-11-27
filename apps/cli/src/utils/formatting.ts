// ANSI color codes
// Brand color: #2596be (RGB: 37, 150, 190)
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  // Brand color #2596be
  brand: '\x1b[38;2;37;150;190m',
  prompt: '\x1b[38;2;255;203;81m',
  // Standard colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Box drawing characters
const boxChars = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  topT: '┬',
  bottomT: '┴',
  leftT: '├',
  rightT: '┤',
  cross: '┼',
};

// Strip ANSI codes to get actual visible length
function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function getVisibleLength(str: string): number {
  return stripAnsiCodes(str).length;
}

export function box(
  text: string,
  options?: { title?: string; color?: string },
): string {
  // Trim trailing spaces from each line for consistent alignment
  const lines = text.split('\n').map((line) => line.trimEnd());
  // Filter out completely empty lines for width calculation, but keep them for display
  const nonEmptyLines = lines.filter((line) => line.length > 0);
  const maxWidth = Math.max(
    ...(nonEmptyLines.length > 0
      ? nonEmptyLines.map((line) => getVisibleLength(line))
      : [0]),
    options?.title ? getVisibleLength(options.title) + 2 : 0,
  );
  const padding = 2;
  const width = maxWidth + padding * 2;

  let result = '';

  // Top border
  if (options?.title) {
    const titleVisibleLength = getVisibleLength(options.title);
    const titlePadding = Math.floor((width - titleVisibleLength - 2) / 2);
    const titleLine =
      ' '.repeat(titlePadding) +
      options.title +
      ' '.repeat(width - titlePadding - titleVisibleLength - 2);
    result +=
      (options.color || '') +
      boxChars.topLeft +
      boxChars.horizontal.repeat(width - 2) +
      boxChars.topRight +
      colors.reset +
      '\n';
    result +=
      (options.color || '') +
      boxChars.vertical +
      colors.reset +
      colors.white +
      titleLine +
      colors.reset +
      (options.color || '') +
      boxChars.vertical +
      colors.reset +
      '\n';
    result +=
      (options.color || '') +
      boxChars.leftT +
      boxChars.horizontal.repeat(width - 2) +
      boxChars.rightT +
      colors.reset +
      '\n';
  } else {
    result +=
      (options?.color || '') +
      boxChars.topLeft +
      boxChars.horizontal.repeat(width - 2) +
      boxChars.topRight +
      colors.reset +
      '\n';
  }

  // Content (use white for text, color for borders)
  for (const line of lines) {
    const visibleLength = getVisibleLength(line);
    // Calculate right padding: total width is maxWidth + 2*padding
    // We have: padding (left) + line + rightPadding = maxWidth + 2*padding
    // So: rightPadding = maxWidth + 2*padding - padding - visibleLength = maxWidth + padding - visibleLength
    const rightPadding = maxWidth - visibleLength + padding;
    result +=
      (options?.color || '') +
      boxChars.vertical +
      colors.reset +
      ' '.repeat(padding) +
      (line || '') + // Handle empty lines
      ' '.repeat(rightPadding) +
      (options?.color || '') +
      boxChars.vertical +
      colors.reset +
      '\n';
  }

  // Bottom border
  result +=
    (options?.color || '') +
    boxChars.bottomLeft +
    boxChars.horizontal.repeat(width - 2) +
    boxChars.bottomRight +
    colors.reset;

  return result;
}

export function infoBox(text: string): string {
  return box(text, { title: 'ℹ️  Info', color: colors.brand });
}

export function successBox(text: string): string {
  return box(text, { title: '✓ Success', color: colors.brand });
}

export function errorBox(text: string): string {
  return box(text, { title: '✗ Error', color: colors.red });
}

export function warningBox(text: string): string {
  return box(text, { title: '⚠ Warning', color: colors.yellow });
}

export function queryBox(query: string): string {
  return box(query, { title: 'Query', color: colors.brand });
}

export function resultBox(content: string): string {
  return box(content, { title: 'Result', color: colors.green });
}

export function separator(): string {
  return colors.brand + '─'.repeat(60) + colors.reset;
}

export function colored(text: string, color: string): string {
  return color + text + colors.reset;
}

export function formatTable(
  data: Array<Record<string, unknown>>,
  options?: { color?: string },
): string {
  if (data.length === 0) {
    return '';
  }

  const color = options?.color || colors.brand;
  const firstRow = data[0];
  if (!firstRow) {
    return '';
  }
  const keys = Object.keys(firstRow);

  // Calculate column widths (strip ANSI codes for accurate measurement)
  const columnWidths: Record<string, number> = {};
  for (const key of keys) {
    let maxWidth = getVisibleLength(key);
    for (const row of data) {
      const value = row[key];
      if (value != null) {
        const valueStr = String(value);
        maxWidth = Math.max(maxWidth, getVisibleLength(valueStr));
      }
    }
    columnWidths[key] = maxWidth;
  }

  // Build table
  let result = '';

  // Top border
  result += color + boxChars.topLeft;
  for (let i = 0; i < keys.length; i++) {
    result += boxChars.horizontal.repeat(columnWidths[keys[i]!]! + 2);
    if (i < keys.length - 1) {
      result += boxChars.topT;
    }
  }
  result += boxChars.topRight + colors.reset + '\n';

  // Header row
  result += color + boxChars.vertical + colors.reset;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const width = columnWidths[key]!;
    const keyDisplay = colors.white + key + colors.reset;
    const padding = width - getVisibleLength(key);
    result +=
      ' ' +
      keyDisplay +
      ' '.repeat(padding) +
      ' ' +
      color +
      boxChars.vertical +
      colors.reset;
  }
  result += '\n';

  // Header separator
  result += color + boxChars.leftT;
  for (let i = 0; i < keys.length; i++) {
    result += boxChars.horizontal.repeat(columnWidths[keys[i]!]! + 2);
    if (i < keys.length - 1) {
      result += boxChars.cross;
    }
  }
  result += boxChars.rightT + colors.reset + '\n';

  // Data rows
  for (const row of data) {
    result += color + boxChars.vertical + colors.reset;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const width = columnWidths[key]!;
      const value = row[key];
      const valueStr = value != null ? String(value) : '';
      const valueDisplay = colors.white + valueStr + colors.reset;
      const padding = width - getVisibleLength(valueStr);
      result +=
        ' ' +
        valueDisplay +
        ' '.repeat(padding) +
        ' ' +
        color +
        boxChars.vertical +
        colors.reset;
    }
    result += '\n';
  }

  // Bottom border
  result += color + boxChars.bottomLeft;
  for (let i = 0; i < keys.length; i++) {
    result += boxChars.horizontal.repeat(columnWidths[keys[i]!]! + 2);
    if (i < keys.length - 1) {
      result += boxChars.bottomT;
    }
  }
  result += boxChars.bottomRight + colors.reset;

  return result;
}
