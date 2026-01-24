import { ArrowRight, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../../shadcn/card';
import { cn } from '../../lib/utils';
import { formatRelativeTime } from '../ai/utils/conversation-utils';
import { Badge } from '../../shadcn/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../shadcn/context-menu';
import type { ReactNode } from 'react';

export interface EntityCardProps {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status?: string;
  createdAt?: Date;
  createdBy?: string;
  icon?: LucideIcon;
  iconElement?: ReactNode;
  viewButton?: ReactNode;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  dataTest?: string;
  variant?: 'project' | 'organization' | 'datasource';
}

export function EntityCard({
  id,
  name,
  slug,
  description,
  status,
  createdAt,
  createdBy,
  icon: Icon,
  iconElement,
  viewButton,
  onClick,
  onEdit,
  onDelete,
  className,
  dataTest,
  variant = 'project',
}: EntityCardProps) {
  const statusColor =
    status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : status === 'inactive'
        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        : status
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
          : '';

  const displayIcon = iconElement || (Icon ? <Icon className="h-6 w-6 transition-colors" /> : null);

  const hasActions = onEdit || onDelete;

  const cardContent = (
    <Card
      className={cn(
        'group bg-card hover:border-primary hover:shadow-primary/5 relative flex w-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl',
        'cursor-pointer',
        className,
      )}
      onClick={onClick}
      data-test={dataTest || `entity-card-${id}`}
    >
      <CardContent className="flex flex-row items-start gap-4 p-6">
        <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300">
          {displayIcon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-foreground truncate text-lg font-bold tracking-tight transition-colors">
                {name}
              </div>
              {slug && (
                <p className="text-muted-foreground truncate text-xs font-medium font-mono">
                  {slug}
                </p>
              )}
              {createdAt && (
                <div className="text-muted-foreground/70 text-[10px] font-medium">
                  {formatRelativeTime(createdAt)}
                </div>
              )}
            </div>
            {status && (
              <Badge
                variant="secondary"
                className={cn('h-5 px-2 text-[10px] uppercase tracking-wider font-bold border shrink-0', statusColor)}
              >
                {status}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground/80 line-clamp-2 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </CardContent>

      <CardContent className="relative flex items-center justify-end p-6 pt-0">
        {viewButton ? (
          <div className="text-primary flex items-center gap-2 text-xs font-bold tracking-tight uppercase">
            {viewButton}
          </div>
        ) : (
          <div className="text-primary flex items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (hasActions) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {cardContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {onEdit && (
            <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </ContextMenuItem>
          )}
          {onEdit && onDelete && <ContextMenuSeparator />}
          {onDelete && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return cardContent;
}

