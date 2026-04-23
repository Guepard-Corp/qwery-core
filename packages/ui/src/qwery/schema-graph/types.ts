import type { Edge, Node, XYPosition } from '@xyflow/react';
import type {
  Column,
  DatasourceMetadata,
  Schema,
  Table,
} from '@qwery/domain/entities';

export type TableNodeColumn = {
  id: string;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isIdentity: boolean;
  isForeignKey: boolean;
  name: string;
  format: string;
};

export type TableNodeData = {
  id?: number;
  name: string;
  schema?: string;
  ref?: string;
  isForeign: boolean;
  isFocused?: boolean;
  columns: TableNodeColumn[];
};

export type TableNode = Node<TableNodeData>;

export type TableEdge = Edge;

export type TableNodePosition = XYPosition;

export type SchemaGraphMetadata = DatasourceMetadata & {
  schemas?: Schema[];
  tables?: Table[];
  columns?: Column[];
};
