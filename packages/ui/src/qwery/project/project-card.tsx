import { ArrowRight, FolderKanban, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card';
import { Trans } from '../trans';
import { cn } from '../../lib/utils';
import { formatRelativeTime } from '../ai/utils/conversation-utils';
import { Badge } from '../../shadcn/badge';
import type { ReactNode } from 'react';

export interface ProjectCardProps {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status?: string;
  createdAt?: Date;
  createdBy?: string;
  viewButton?: ReactNode;
  onClick?: () => void;
  className?: string;
  dataTest?: string;
}

export function ProjectCard({
  id,
  name,
  slug,
  description,
  status,
  createdAt,
  createdBy,
  viewButton,
  onClick,
  className,
  dataTest,
}: ProjectCardProps) {
  const statusColor =
    status === 'active'
      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      : status === 'inactive'
        ? 'bg-muted text-muted-foreground border-border'
        : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';

  return (
    <Card
      className={cn(
        'group bg-card hover:border-primary hover:shadow-primary/5 relative flex w-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl',
        'cursor-pointer',
        className,
      )}
      onClick={onClick}
      data-test={dataTest || `project-card-${id}`}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-6">
        <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300">
          <FolderKanban className="h-6 w-6 transition-colors" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-foreground text-lg font-bold tracking-tight transition-colors">
              {name}
            </CardTitle>
            {status && (
              <Badge
                variant="outline"
                className={cn('h-5 px-2 text-[10px] uppercase tracking-wider font-bold border', statusColor)}
              >
                {status}
              </Badge>
            )}
          </div>
          {slug && (
            <p className="text-muted-foreground truncate text-xs font-medium font-mono">
              {slug}
            </p>
          )}
          {description && (
            <p className="text-muted-foreground/80 mt-1 line-clamp-2 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex flex-col gap-6 p-6 pt-0">
        <div className="flex items-center justify-between gap-4 text-xs font-medium text-muted-foreground/80">
          {createdAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatRelativeTime(createdAt)}</span>
            </div>
          )}
          {createdBy && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{createdBy}</span>
            </div>
          )}
        </div>

        {viewButton ? (
          <div className="text-primary mt-2 flex items-center gap-2 text-xs font-bold tracking-tight uppercase">
            {viewButton}
          </div>
        ) : (
          <div className="text-primary mt-2 flex items-center gap-2 text-xs font-bold tracking-tight uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            View Project{' '}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
