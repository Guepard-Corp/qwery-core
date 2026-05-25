/**
 * Identifier/query tokenization and BootOX direct-mapping IRI helpers, ported
 * from the reference Python ontology service. All identifier IRIs live under
 * the `ex:` prefix (`http://qwery.local/ontology/`).
 */

/** Split on `_`/non-word runs and at lowercase→uppercase (camelCase) boundaries. */
const TOKEN_SPLIT_RE = /[_\W]+|(?<=[a-z])(?=[A-Z])/;

/** Match query terms: a letter followed by ≥2 alphanumerics (length ≥ 3). */
const QUERY_TOKEN_RE = /[a-z][a-z0-9]{2,}/g;

function capitalize(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

/** Split a snake_case / camelCase / PascalCase identifier into lowercased tokens. */
export function splitIdentifier(ident: string): string[] {
  return ident
    .split(TOKEN_SPLIT_RE)
    .filter((part) => part.length > 0)
    .map((part) => part.toLowerCase());
}

/** `customer_orders` → `CustomerOrders`; empty → `Unknown`. */
export function toPascal(ident: string): string {
  const tokens = splitIdentifier(ident);
  return tokens.map(capitalize).join('') || 'Unknown';
}

/** `customer_orders` → `customerOrders`; empty → `unknown`. */
export function toCamel(ident: string): string {
  const tokens = splitIdentifier(ident);
  if (tokens.length === 0) {
    return 'unknown';
  }
  return tokens[0] + tokens.slice(1).map(capitalize).join('');
}

/** DataProperty IRI for a column, e.g. `gross_amount` → `ex:grossAmount`. */
export function dataPropertyIri(columnName: string): string {
  return `ex:${toCamel(columnName)}`;
}

/** ObjectProperty IRI for an FK column, e.g. `customer_id` → `ex:hasCustomer`. */
export function objectPropertyIri(sourceColumn: string): string {
  let tokens = splitIdentifier(sourceColumn);
  if (tokens.length > 0 && tokens[tokens.length - 1] === 'id') {
    tokens = tokens.slice(0, -1);
  }
  const target = tokens.map(capitalize).join('') || 'Target';
  return `ex:has${target}`;
}

/** Lowercased, de-duplicated set of query terms (length ≥ 3, alpha-prefixed). */
export function tokenizeQuery(queryText: string): Set<string> {
  const matches = queryText.toLowerCase().match(QUERY_TOKEN_RE) ?? [];
  return new Set(matches);
}

/** Map a SQL/source `data_type` label to an XSD datatype (BootOX Q4, narrow). */
export function xsdFor(dataType: string): string {
  const t = dataType.toLowerCase();
  if (t.includes('int') || t.includes('serial')) {
    return 'xsd:integer';
  }
  if (['float', 'double', 'real', 'decimal', 'numeric'].some((x) => t.includes(x))) {
    return 'xsd:decimal';
  }
  if (t.includes('bool')) {
    return 'xsd:boolean';
  }
  if (t.includes('date') && !t.includes('time')) {
    return 'xsd:date';
  }
  if (t.includes('timestamp') || t.includes('datetime')) {
    return 'xsd:dateTime';
  }
  return 'xsd:string';
}
