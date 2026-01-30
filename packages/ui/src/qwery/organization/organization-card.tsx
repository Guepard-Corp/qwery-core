import { Building2 } from 'lucide-react';
import { EntityCard } from '../entity-card/entity-card';
import type { ReactNode } from 'react';

export interface OrganizationCardProps {
  id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  createdBy?: string;
  status?: string;
  viewButton?: ReactNode;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  dataTest?: string;
}

export function OrganizationCard({
  onEdit,
  onDelete,
  ...props
}: OrganizationCardProps) {
  return (
    <EntityCard
      {...props}
      icon={Building2}
      variant="organization"
      dataTest={props.dataTest || `organization-card-${props.id}`}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
