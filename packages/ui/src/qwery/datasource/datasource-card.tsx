import { useCallback, useState } from 'react';
import { Database } from 'lucide-react';

import { EntityCard } from '../entity-card/entity-card';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export interface DatasourceCardProps {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  logo?: string;
  provider?: string;
  onLogoError?: (datasourceId: string) => void;
  viewButton?: ReactNode;
  onClick?: () => void;
  className?: string;
  dataTest?: string;
}

function formatProviderName(provider?: string): string {
  if (!provider) return '';

  return provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function DatasourceCard({
  id,
  name,
  createdAt,
  createdBy: _createdBy,
  logo,
  provider,
  onLogoError,
  viewButton,
  onClick,
  className,
  dataTest,
}: DatasourceCardProps) {
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = useCallback(() => {
    setLogoError(true);
    onLogoError?.(id);
  }, [id, onLogoError]);

  const showLogo = logo && !logoError;
  const providerDisplayName = formatProviderName(provider);

  const iconElement = showLogo ? (
    <img
      src={logo}
      alt={name}
      className={cn(
        'h-8 w-8 object-contain transition-transform group-hover:scale-110',
      )}
      onError={handleLogoError}
    />
  ) : (
    <Database className="text-primary h-7 w-7 transition-transform group-hover:scale-110" />
  );

  return (
    <EntityCard
      id={id}
      name={name}
      createdAt={createdAt}
      iconElement={iconElement}
      status={providerDisplayName}
      viewButton={viewButton}
      onClick={onClick}
      className={className}
      dataTest={dataTest || `datasource-card-${id}`}
      variant="datasource"
    />
  );
}
