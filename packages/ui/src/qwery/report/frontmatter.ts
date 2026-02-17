/**
 * Minimal browser-safe YAML frontmatter parser.
 *
 * Supports the subset of YAML used in report frontmatter:
 *   - String values (quoted or unquoted)
 *   - Flow-style arrays: ["a", "b", "c"]
 *   - Block-style arrays:
 *       key:
 *         - value1
 *         - value2
 */

type FrontmatterValue = string | string[];
type FrontmatterData = Record<string, FrontmatterValue>;

export interface ParsedFrontmatter {
  data: FrontmatterData;
  content: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Strip surrounding quotes from a YAML string value */
function stripQuotes(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/** Parse a flow-style array: ["a", "b"] or ['a', 'b'] */
function parseFlowArray(value: string): string[] {
  const inner = value.trim().slice(1, -1); // remove [ and ]
  return inner
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter(Boolean);
}

/**
 * Parse a YAML frontmatter string into a plain object.
 * Only handles string and string[] values.
 */
function parseYaml(yaml: string): FrontmatterData {
  const result: FrontmatterData = {};
  const lines = yaml.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue === '') {
      // Possible block-style array — look ahead for "  - item" lines
      const items: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i] ?? '';
        const itemMatch = /^\s+-\s+(.+)$/.exec(next);
        if (itemMatch) {
          items.push(stripQuotes(itemMatch[1]?.trim() ?? ''));
          i++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        result[key] = items;
      }
      continue;
    }

    // Flow-style array
    if (rawValue.startsWith('[')) {
      result[key] = parseFlowArray(rawValue);
    } else {
      result[key] = stripQuotes(rawValue);
    }

    i++;
  }

  return result;
}

/**
 * Parse a markdown string that may begin with YAML frontmatter (between --- delimiters).
 * Returns the parsed data and the remaining content (without the frontmatter block).
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const match = FRONTMATTER_RE.exec(markdown);
  if (!match) {
    return { data: {}, content: markdown };
  }
  const yaml = match[1] ?? '';
  const content = markdown.slice(match[0].length);
  return { data: parseYaml(yaml), content };
}

/**
 * Serialize data and content back to a markdown string with YAML frontmatter.
 */
export function stringifyFrontmatter(
  content: string,
  data: FrontmatterData,
): string {
  if (Object.keys(data).length === 0) return content;

  const lines = Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.map((v) => `"${v}"`).join(', ')}]`;
    }
    return `${key}: "${value}"`;
  });

  return `---\n${lines.join('\n')}\n---\n${content}`;
}
