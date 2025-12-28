import { createClient } from '@clickhouse/client-web';
import { z } from 'zod';
import { DatasourceMetadataZodSchema } from '@qwery/extensions-sdk';
const ConfigSchema = z.object({
    connectionUrl: z.string().url(),
});
function buildClickHouseConfig(connectionUrl) {
    const url = new URL(connectionUrl);
    const protocol = url.protocol === 'clickhouse:' ? 'http:' : url.protocol;
    const host = `${protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
    return {
        host,
        username: url.username ? decodeURIComponent(url.username) : 'default',
        password: url.password ? decodeURIComponent(url.password) : '',
        database: url.pathname ? url.pathname.replace(/^\//, '') || 'default' : 'default',
    };
}
export function makeClickHouseDriver(context) {
    const clientMap = new Map();
    const getClient = (config) => {
        const key = config.connectionUrl;
        if (!clientMap.has(key)) {
            const clientConfig = buildClickHouseConfig(config.connectionUrl);
            const client = createClient(clientConfig);
            clientMap.set(key, client);
        }
        return clientMap.get(key);
    };
    return {
        async testConnection(config) {
            const parsed = ConfigSchema.parse(config);
            const client = getClient(parsed);
            await client.query({
                query: 'SELECT 1',
                format: 'JSON',
            });
            context.logger?.info?.('clickhouse: testConnection ok');
        },
        async metadata(config) {
            const parsed = ConfigSchema.parse(config);
            const client = getClient(parsed);
            // Get databases (schemas)
            const databasesResult = await client.query({
                query: `SELECT name FROM system.databases WHERE name NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA') ORDER BY name`,
                format: 'JSON',
            });
            const databasesData = await databasesResult.json();
            const databases = databasesData.data;
            // Get tables and columns
            const tablesResult = await client.query({
                query: `
          SELECT 
            database as table_schema,
            name as table_name,
            total_rows,
            total_bytes
          FROM system.tables
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, name
        `,
                format: 'JSON',
            });
            const tablesData = await tablesResult.json();
            // Get columns
            const columnsResult = await client.query({
                query: `
          SELECT 
            database as table_schema,
            table as table_name,
            name as column_name,
            type as data_type,
            position as ordinal_position,
            default_kind,
            default_expression
          FROM system.columns
          WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
          ORDER BY database, table, position
        `,
                format: 'JSON',
            });
            const columnsData = await columnsResult.json();
            let tableId = 1;
            const tableMap = new Map();
            const buildColumn = (schema, table, name, ordinal, dataType) => ({
                id: `${schema}.${table}.${name}`,
                table_id: 0,
                schema,
                table,
                name,
                ordinal_position: ordinal,
                data_type: dataType,
                format: dataType,
                is_identity: false,
                identity_generation: null,
                is_generated: false,
                is_nullable: true, // ClickHouse columns are generally nullable unless specified
                is_updatable: true,
                is_unique: false,
                check: null,
                default_value: null,
                enums: [],
                comment: null,
            });
            // Build table map
            for (const row of tablesData.data) {
                const key = `${row.table_schema}.${row.table_name}`;
                if (!tableMap.has(key)) {
                    tableMap.set(key, {
                        id: tableId++,
                        schema: row.table_schema,
                        name: row.table_name,
                        totalRows: row.total_rows,
                        totalBytes: row.total_bytes,
                        columns: [],
                    });
                }
            }
            // Add columns to tables
            for (const row of columnsData.data) {
                const key = `${row.table_schema}.${row.table_name}`;
                const table = tableMap.get(key);
                if (table) {
                    table.columns.push(buildColumn(row.table_schema, row.table_name, row.column_name, row.ordinal_position, row.data_type));
                }
            }
            const tables = Array.from(tableMap.values()).map((table) => ({
                id: table.id,
                schema: table.schema,
                name: table.name,
                rls_enabled: false,
                rls_forced: false,
                bytes: Number(table.totalBytes) || 0,
                size: String(table.totalRows ?? '0'),
                live_rows_estimate: Number(table.totalRows) || 0,
                dead_rows_estimate: 0,
                comment: null,
                primary_keys: [],
                relationships: [],
            }));
            const columns = Array.from(tableMap.values()).flatMap((table) => table.columns.map((column) => ({
                ...column,
                table_id: table.id,
            })));
            const schemas = databases.map((db, idx) => ({
                id: idx + 1,
                name: db.name,
                owner: 'unknown',
            }));
            return DatasourceMetadataZodSchema.parse({
                version: '0.0.1',
                driver: 'clickhouse.web',
                schemas,
                tables,
                columns,
            });
        },
        async query(sql, config) {
            const parsed = ConfigSchema.parse(config);
            const client = getClient(parsed);
            const startTime = performance.now();
            const result = await client.query({
                query: sql,
                format: 'JSON',
            });
            const data = await result.json();
            const endTime = performance.now();
            const columns = data.meta.map((meta) => ({
                name: meta.name,
                displayName: meta.name,
                originalType: meta.type,
            }));
            return {
                columns,
                rows: data.data,
                stat: {
                    rowsAffected: 0,
                    rowsRead: data.data.length,
                    rowsWritten: 0,
                    queryDurationMs: endTime - startTime,
                },
            };
        },
        async close() {
            // Close all ClickHouse clients
            for (const client of clientMap.values()) {
                await client.close();
            }
            clientMap.clear();
            context.logger?.info?.('clickhouse: closed');
        },
    };
}
// Expose a stable factory export for the runtime loader
export const driverFactory = makeClickHouseDriver;
export default driverFactory;
