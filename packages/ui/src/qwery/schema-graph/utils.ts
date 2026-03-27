import dagre from '@dagrejs/dagre';
import type { Edge, Node, Position, XYPosition } from '@xyflow/react';

import type { Column, Table } from '@qwery/domain/entities';
import type {
  SchemaGraphMetadata,
  TableNode,
  TableNodeData,
  TableNodeColumn,
} from './types';
import { TABLE_NODE_ROW_HEIGHT, TABLE_NODE_WIDTH } from './table-node';

const NODE_SEP = 25;
const RANK_SEP = 50;

type SavedPositions = Record<
  string,
  {
    x: number;
    y: number;
  }
>;

function getRankDirection(aspectRatio?: number): 'LR' | 'TB' {
  if (!aspectRatio) return 'LR';
  return aspectRatio < 1 ? 'TB' : 'LR';
}

function getNodeHandlePositions(rankdir: 'LR' | 'TB'): {
  targetPosition: Position;
  sourcePosition: Position;
} {
  if (rankdir === 'TB') {
    return {
      targetPosition: 'top' as Position,
      sourcePosition: 'bottom' as Position,
    };
  }

  return {
    targetPosition: 'left' as Position,
    sourcePosition: 'right' as Position,
  };
}

export function getGraphDataFromMetadata(
  metadata: SchemaGraphMetadata | null | undefined,
  selectedSchemas: string[] | null,
): {
  nodes: TableNode[];
  edges: Edge[];
} {
  if (!metadata?.tables?.length) {
    return { nodes: [], edges: [] };
  }

  const schemaFilter =
    selectedSchemas && selectedSchemas.length > 0
      ? new Set(selectedSchemas)
      : null;

  const tables = metadata.tables.filter((table) =>
    schemaFilter ? schemaFilter.has(table.schema) : true,
  );

  const columnsByTableId = new Map<number, TableNodeColumn[]>();
  const getColumnsForTable = (table: Table): TableNodeColumn[] => {
    const cached = columnsByTableId.get(table.id);
    if (cached) return cached;

    const allColumns: Column[] = metadata.columns ?? [];
    const tableColumns: Column[] =
      (table.columns as Column[] | undefined) ??
      allColumns.filter(
        (c: Column) => c.table_id === table.id && c.table === table.name,
      );

    const fkSourceColumns = new Set(
      (table.relationships ?? []).map((rel) => rel.source_column_name),
    );

    const columns: TableNodeColumn[] = tableColumns.map((column: Column) => ({
      id: String(column.id),
      isPrimary: table.primary_keys.some((pk) => pk.name === column.name),
      isForeignKey: fkSourceColumns.has(column.name),
      name: column.name,
      format: column.format,
      isNullable: column.is_nullable,
      isUnique: column.is_unique,
      isIdentity: column.is_identity,
    }));

    columnsByTableId.set(table.id, columns);
    return columns;
  };

  const nodes: TableNode[] = tables.map((table: Table) => {
    const columns = getColumnsForTable(table);

    return {
      id: String(table.id),
      type: 'table',
      data: {
        id: table.id,
        name: table.name,
        schema: table.schema,
        isForeign: false,
        columns,
      } satisfies TableNodeData,
      position: { x: 0, y: 0 },
    };
  });

  const edges: Edge[] = [];
  const currentSchemas = new Set(tables.map((t: Table) => t.schema));

  type Relationship = Table['relationships'][number];
  const uniqueRelationships = uniqueBy<Relationship>(
    tables.flatMap((t: Table) => t.relationships ?? []),
    (rel: Relationship) => rel.id,
  );

  for (const rel of uniqueRelationships) {
    if (!currentSchemas.has(rel.source_schema)) {
      continue;
    }

    if (!currentSchemas.has(rel.target_table_schema)) {
      const foreignNodeId = rel.constraint_name;
      const nodeExists = nodes.some((n) => n.id === foreignNodeId);

      if (!nodeExists) {
        nodes.push({
          id: foreignNodeId,
          type: 'table',
          data: {
            name: `${rel.target_table_schema}.${rel.target_table_name}.${rel.target_column_name}`,
            isForeign: true,
            columns: [],
          } satisfies TableNodeData,
          position: { x: 0, y: 0 },
        });
      }

      const [source, sourceHandle] = findTablesHandleIds(
        tables,
        rel.source_table_name,
        rel.source_column_name,
        metadata,
      );

      if (source) {
        edges.push({
          id: String(rel.id),
          type: 'smoothstep',
          source,
          sourceHandle,
          target: foreignNodeId,
          targetHandle: foreignNodeId,
          markerEnd: { type: 'arrowclosed' as const },
        });
      }

      continue;
    }

    const [source, sourceHandle] = findTablesHandleIds(
      tables,
      rel.source_table_name,
      rel.source_column_name,
      metadata,
    );
    const [target, targetHandle] = findTablesHandleIds(
      tables,
      rel.target_table_name,
      rel.target_column_name,
      metadata,
    );

    if (source && target) {
      edges.push({
        id: String(rel.id),
        type: 'smoothstep',
        source,
        sourceHandle,
        target,
        targetHandle,
        markerEnd: { type: 'arrowclosed' as const },
      });
    }
  }

  return { nodes, edges };
}

function findTablesHandleIds(
  tables: Table[],
  tableName: string,
  columnName: string,
  metadata: SchemaGraphMetadata | null | undefined,
): [string?, string?] {
  const allColumns = metadata?.columns ?? [];

  for (const table of tables) {
    if (tableName !== table.name) continue;

    const tableColumns =
      table.columns ??
      allColumns.filter(
        (c) => c.table_id === table.id && c.table === table.name,
      );

    for (const column of tableColumns) {
      if (columnName !== column.name) continue;

      return [String(table.id), String(column.id)];
    }
  }

  return [];
}

export const getLayoutedElementsViaDagre = (
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  options?: { aspectRatio?: number },
) => {
  const rankdir = getRankDirection(options?.aspectRatio);
  const { sourcePosition, targetPosition } = getNodeHandlePositions(rankdir);

  const connectedNodesSet = new Set<string>();
  edges.forEach((edge) => {
    connectedNodesSet.add(edge.source);
    connectedNodesSet.add(edge.target);
  });

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir,
    align: 'DL',
    nodesep: NODE_SEP * 2,
    ranksep: RANK_SEP * 2,
  });

  nodes.forEach((node) => {
    if (connectedNodesSet.has(node.id)) {
      dagreGraph.setNode(node.id, {
        width: TABLE_NODE_WIDTH / 2,
        height: (TABLE_NODE_ROW_HEIGHT / 2) * (node.data.columns.length + 1),
      });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  let maxX = 0;
  let maxY = 0;

  nodes.forEach((node) => {
    if (connectedNodesSet.has(node.id)) {
      const nodeWithPosition = dagreGraph.node(node.id) as {
        x: number;
        y: number;
        width: number;
        height: number;
      };

      node.targetPosition = targetPosition;
      node.sourcePosition = sourcePosition;

      node.position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      };

      maxX = Math.max(maxX, node.position.x + nodeWithPosition.width);
      maxY = Math.max(maxY, node.position.y + nodeWithPosition.height);
    }
  });

  const isolatedNodes = nodes.filter((n) => !connectedNodesSet.has(n.id));

  if (isolatedNodes.length > 0) {
    const nodeWidth = TABLE_NODE_WIDTH / 2;
    const paddingX = NODE_SEP * 2;
    const paddingY = RANK_SEP * 2;

    const baseAspectCols = Math.ceil(
      Math.sqrt(isolatedNodes.length * (options?.aspectRatio || 1.5)),
    );
    let gridCols = Math.max(1, baseAspectCols);

    if (maxX > 0) {
      const colsByWidth = Math.max(
        1,
        Math.floor(maxX / (nodeWidth + paddingX)),
      );
      gridCols = Math.max(gridCols, colsByWidth);
    }

    let currentX = 0;
    let currentY = maxY > 0 ? maxY + paddingY * 1.5 : 0;
    let rowHeight = 0;
    let colIndex = 0;

    isolatedNodes.forEach((node) => {
      node.targetPosition = targetPosition;
      node.sourcePosition = sourcePosition;

      const height =
        (TABLE_NODE_ROW_HEIGHT / 2) * (node.data.columns.length + 1);

      node.position = {
        x: currentX,
        y: currentY,
      };

      rowHeight = Math.max(rowHeight, height);
      currentX += nodeWidth + paddingX;
      colIndex++;

      if (colIndex >= gridCols) {
        colIndex = 0;
        currentX = 0;
        currentY += rowHeight + paddingY;
        rowHeight = 0;
      }
    });
  }

  return { nodes, edges };
};

export const getLayoutedElementsViaLocalStorage = (
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  positions: SavedPositions,
  options?: { aspectRatio?: number },
) => {
  const rankdir = getRankDirection(options?.aspectRatio);
  const { sourcePosition, targetPosition } = getNodeHandlePositions(rankdir);
  const nodesWithNoSavedPositions = nodes.filter((n) => !(n.id in positions));
  let newNodeCount = 0;
  const basePosition: XYPosition = {
    x: 0,
    y: -(
      NODE_SEP +
      TABLE_NODE_ROW_HEIGHT +
      nodesWithNoSavedPositions.length * 10
    ),
  };

  nodes.forEach((node) => {
    const existingPosition = positions?.[node.id];

    node.targetPosition = targetPosition;
    node.sourcePosition = sourcePosition;

    if (existingPosition) {
      node.position = existingPosition;
    } else {
      node.position = {
        x: basePosition.x + newNodeCount * 10,
        y: basePosition.y + newNodeCount * 10,
      };
      newNodeCount += 1;
    }
  });

  return { nodes, edges };
};

function uniqueBy<T>(items: T[], getKey: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
