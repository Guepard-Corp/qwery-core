import { FolderKanban } from 'lucide-react';
import { EntityCard } from '../entity-card/entity-card';
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
  onEdit?: () => void;
  onDelete?: () => void;
  onPause?: () => void;
  className?: string;
  dataTest?: string;
}

export function ProjectCard({
  onEdit,
  onDelete,
  onPause,
  ...props
}: ProjectCardProps) {
  return (
    <EntityCard
      {...props}
      icon={FolderKanban}
      variant="project"
      dataTest={props.dataTest || `project-card-${props.id}`}
      onEdit={onEdit}
      onDelete={onDelete}
      onPause={onPause}
    />
  );
}
