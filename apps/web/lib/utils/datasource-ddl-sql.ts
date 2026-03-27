/** Escape and quote identifiers for DDL (PostgreSQL-style double quotes). */
function qPg(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

/** Escape and quote identifiers for MySQL-style backticks. */
function qMy(ident: string): string {
  return `\`${ident.replace(/`/g, '``')}\``;
}

type DdlDialect = 'postgres' | 'mysql' | 'clickhouse';

function dialectForProvider(datasourceProvider: string): DdlDialect {
  if (datasourceProvider.startsWith('postgresql')) {
    return 'postgres';
  }
  if (datasourceProvider === 'mysql') {
    return 'mysql';
  }
  if (datasourceProvider.startsWith('clickhouse')) {
    return 'clickhouse';
  }
  return 'postgres';
}

function defaultSchema(dialect: DdlDialect, schema: string): string {
  if (schema) return schema;
  if (dialect === 'clickhouse') return 'default';
  return 'main';
}

function tableRef(dialect: DdlDialect, schema: string, table: string): string {
  const s = defaultSchema(dialect, schema);
  const t = table;
  if (dialect === 'postgres') {
    return `${qPg(s)}.${qPg(t)}`;
  }
  return `${qMy(s)}.${qMy(t)}`;
}

export function buildRenameTableSql(
  datasourceProvider: string,
  schema: string,
  tableName: string,
  newTableName: string,
): string {
  const d = dialectForProvider(datasourceProvider);
  if (d === 'clickhouse') {
    const s = defaultSchema(d, schema);
    return `RENAME TABLE ${qMy(s)}.${qMy(tableName)} TO ${qMy(s)}.${qMy(newTableName)}`;
  }
  if (d === 'mysql') {
    const ref = tableRef(d, schema, tableName);
    const newRef = tableRef(d, schema, newTableName);
    return `RENAME TABLE ${ref} TO ${newRef}`;
  }
  return `ALTER TABLE ${tableRef(d, schema, tableName)} RENAME TO ${qPg(newTableName)}`;
}

export function buildTruncateTableSql(
  datasourceProvider: string,
  schema: string,
  tableName: string,
): string {
  const d = dialectForProvider(datasourceProvider);
  const ref = tableRef(d, schema, tableName);
  if (d === 'clickhouse') {
    return `TRUNCATE TABLE IF EXISTS ${ref}`;
  }
  return `TRUNCATE TABLE ${ref}`;
}

export function buildDropTableSql(
  datasourceProvider: string,
  schema: string,
  tableName: string,
): string {
  const d = dialectForProvider(datasourceProvider);
  const ref = tableRef(d, schema, tableName);
  if (d === 'clickhouse') {
    return `DROP TABLE IF EXISTS ${ref}`;
  }
  return `DROP TABLE ${ref}`;
}

export function buildRenameColumnSql(
  datasourceProvider: string,
  schema: string,
  tableName: string,
  columnName: string,
  newColumnName: string,
): string {
  const d = dialectForProvider(datasourceProvider);
  const tref = tableRef(d, schema, tableName);
  if (d === 'clickhouse') {
    return `ALTER TABLE ${tref} RENAME COLUMN ${qMy(columnName)} TO ${qMy(newColumnName)}`;
  }
  if (d === 'mysql') {
    return `ALTER TABLE ${tref} RENAME COLUMN ${qMy(columnName)} TO ${qMy(newColumnName)}`;
  }
  return `ALTER TABLE ${tref} RENAME COLUMN ${qPg(columnName)} TO ${qPg(newColumnName)}`;
}

export function buildDropColumnSql(
  datasourceProvider: string,
  schema: string,
  tableName: string,
  columnName: string,
  options?: { cascade?: boolean },
): string {
  const d = dialectForProvider(datasourceProvider);
  const tref = tableRef(d, schema, tableName);
  if (d === 'clickhouse') {
    return `ALTER TABLE ${tref} DROP COLUMN IF EXISTS ${qMy(columnName)}`;
  }
  if (d === 'mysql') {
    return `ALTER TABLE ${tref} DROP COLUMN ${qMy(columnName)}`;
  }
  return `ALTER TABLE ${tref} DROP COLUMN ${qPg(columnName)}${
    options?.cascade ? ' CASCADE' : ''
  }`;
}
