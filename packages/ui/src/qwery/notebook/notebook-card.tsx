import { Notebook } from 'lucide-react';
import { EntityCard } from '../entity-card/entity-card';
import type { ReactNode } from 'react';

export interface NotebookCardProps {
  id: string;
  name: ReactNode;
  slug?: string;
  description?: string;
  status?: string;
  createdAt?: Date;
  createdBy?: string;
  hasUnsavedChanges?: boolean;
  viewButton?: ReactNode;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  dataTest?: string;
}

export function NotebookCard({
  hasUnsavedChanges,
  ...props
}: NotebookCardProps) {
  return (
    <EntityCard
      {...props}
      icon={Notebook}
      status={hasUnsavedChanges ? 'Unsaved' : props.status}
      variant="notebook"
      dataTest={props.dataTest || `notebook-card-${props.id}`}
    />
  );
}
