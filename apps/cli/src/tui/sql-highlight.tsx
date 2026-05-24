import { Text } from 'ink';

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'OUTER',
  'FULL',
  'CROSS',
  'ON',
  'GROUP',
  'BY',
  'ORDER',
  'LIMIT',
  'OFFSET',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'WITH',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'ALL',
  'DISTINCT',
  'HAVING',
  'ASC',
  'DESC',
  'BETWEEN',
  'LIKE',
  'ILIKE',
  'EXISTS',
  'CREATE',
  'TABLE',
  'VIEW',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'DROP',
  'ALTER',
  'INDEX',
  'DESCRIBE',
  'EXPLAIN',
  'SHOW',
  'USING',
  'SAMPLE',
  'SUMMARIZE',
  'PIVOT',
  'UNPIVOT',
  'QUALIFY',
  'OVER',
  'PARTITION',
  'WINDOW',
  'TRUE',
  'FALSE',
]);

const FUNCTIONS = new Set([
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'NULLIF',
  'CAST',
  'READ_CSV_AUTO',
  'READ_CSV',
  'READ_JSON_AUTO',
  'READ_JSON',
  'READ_PARQUET',
  'DATE_TRUNC',
  'DATE_PART',
  'EXTRACT',
  'NOW',
  'CURRENT_DATE',
  'CURRENT_TIMESTAMP',
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'REPLACE',
  'REGEXP_MATCHES',
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
  'LAG',
  'LEAD',
]);

type Token = { text: string; kind: 'kw' | 'fn' | 'str' | 'num' | 'comment' | 'punct' | 'ident' | 'ws' };

function tokenize(sql: string): Token[] {
  const out: Token[] = [];
  const re =
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|--[^\n]*|\/\*[\s\S]*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w]*\b|\s+|[(),;.])/g;
  let last = 0;
  let m = re.exec(sql);
  while (m !== null) {
    if (m.index > last) {
      out.push({ text: sql.slice(last, m.index), kind: 'punct' });
    }
    const tok = m[0];
    last = m.index + tok.length;
    if (/^--/.test(tok) || /^\/\*/.test(tok)) out.push({ text: tok, kind: 'comment' });
    else if (/^['"`]/.test(tok)) out.push({ text: tok, kind: 'str' });
    else if (/^\d/.test(tok)) out.push({ text: tok, kind: 'num' });
    else if (/^\s+$/.test(tok)) out.push({ text: tok, kind: 'ws' });
    else if (/^[A-Za-z_]/.test(tok)) {
      const up = tok.toUpperCase();
      if (KEYWORDS.has(up)) out.push({ text: tok, kind: 'kw' });
      else if (FUNCTIONS.has(up)) out.push({ text: tok, kind: 'fn' });
      else out.push({ text: tok, kind: 'ident' });
    } else {
      out.push({ text: tok, kind: 'punct' });
    }
    m = re.exec(sql);
  }
  if (last < sql.length) out.push({ text: sql.slice(last), kind: 'punct' });
  return out;
}

export function SqlHighlight({ sql }: { sql: string }) {
  const tokens = tokenize(sql);
  return (
    <Text>
      {tokens.map((t, i) => {
        switch (t.kind) {
          case 'kw':
            return (
              <Text key={i} color="cyan" bold>
                {t.text}
              </Text>
            );
          case 'fn':
            return (
              <Text key={i} color="blue">
                {t.text}
              </Text>
            );
          case 'str':
            return (
              <Text key={i} color="yellow">
                {t.text}
              </Text>
            );
          case 'num':
            return (
              <Text key={i} color="magenta">
                {t.text}
              </Text>
            );
          case 'comment':
            return (
              <Text key={i} dimColor>
                {t.text}
              </Text>
            );
          case 'punct':
            return (
              <Text key={i} color="gray">
                {t.text}
              </Text>
            );
          default:
            return <Text key={i}>{t.text}</Text>;
        }
      })}
    </Text>
  );
}
