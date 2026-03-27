import {
  BadgeCheck,
  Brackets,
  Dot,
  KeyRound,
  Split,
  Table2,
} from 'lucide-react';
import { Handle, type NodeProps, type Position } from '@xyflow/react';

import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import type { TableNodeData, TableNodeColumn } from './types';

export const TABLE_NODE_WIDTH = 320;
export const TABLE_NODE_ROW_HEIGHT = 40;

export const TableNode = (props: NodeProps) => {
  const { data, targetPosition, sourcePosition } = props;
  const nodeData = data as TableNodeData;
  const hiddenNodeConnector =
    '!h-px !w-px !min-w-0 !min-h-0 !cursor-grab !border-0 !opacity-0';

  const itemHeight = 'h-[22px]';

  if (!nodeData || nodeData.isForeign) {
    return (
      <header className="bg-muted flex items-center gap-1 rounded-[4px] border-[0.5px] px-2 py-1 text-[0.55rem]">
        {nodeData.name}
        {targetPosition && (
          <Handle
            type="target"
            id={props.id}
            position={targetPosition as Position}
            className={cn(hiddenNodeConnector)}
          />
        )}
      </header>
    );
  }

  return (
    <div
      className={cn(
        'bg-background overflow-hidden rounded-[4px] border-[0.5px] shadow-sm transition-all duration-300',
        nodeData.isFocused &&
          'border-primary ring-primary ring-2 ring-offset-2',
      )}
      style={{ width: TABLE_NODE_WIDTH / 2 }}
    >
      <header
        className={cn(
          'bg-muted flex items-center justify-between pr-1 pl-2 text-[0.55rem]',
          itemHeight,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-x-1 pr-2">
          <Table2
            strokeWidth={1}
            size={12}
            className="text-muted-foreground shrink-0"
          />
          <span className="truncate" title={nodeData.name}>
            {nodeData.name}
          </span>
        </div>
        {nodeData.id && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-[16px] w-[16px] rounded px-0"
          >
            <span className="sr-only">Open table</span>
          </Button>
        )}
      </header>

      {nodeData.columns.map((column: TableNodeColumn) => (
        <div
          className={cn(
            'relative flex flex-row justify-items-start text-[8px] leading-5',
            'bg-muted/40',
            'border-t',
            'border-t-[0.5px]',
            'hover:bg-muted cursor-default transition',
            itemHeight,
          )}
          key={column.id}
        >
          <div
            className={cn(
              'mx-2 flex items-center justify-start gap-[0.24rem] align-middle',
            )}
          >
            {column.isPrimary && (
              <KeyRound
                size={8}
                strokeWidth={1.5}
                className="flex-shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            )}
            {column.isForeignKey && (
              <Split
                size={8}
                strokeWidth={1.5}
                className="flex-shrink-0 text-sky-600 dark:text-sky-400"
              />
            )}
            {column.isNullable && (
              <Dot
                size={8}
                strokeWidth={2}
                className="flex-shrink-0 text-amber-600 dark:text-amber-400"
              />
            )}
            {column.isUnique && (
              <BadgeCheck
                size={8}
                strokeWidth={1.5}
                className="flex-shrink-0 text-indigo-600 dark:text-indigo-400"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1 pr-1">
            <span className="truncate" title={column.name}>
              {column.name}
            </span>
            <span
              className="text-muted-foreground flex shrink-0 items-center justify-end gap-1 font-mono text-[0.4rem]"
              title={column.format}
            >
              <Brackets size={7} strokeWidth={1.5} className="shrink-0" />
              <span className="max-w-[45px] truncate">{column.format}</span>
            </span>
          </div>
          {targetPosition && (
            <Handle
              type="target"
              id={column.id}
              position={targetPosition as Position}
              className={cn(hiddenNodeConnector, '!left-0')}
            />
          )}
          {sourcePosition && (
            <Handle
              type="source"
              id={column.id}
              position={sourcePosition as Position}
              className={cn(hiddenNodeConnector, '!right-0')}
            />
          )}
        </div>
      ))}
    </div>
  );
};
