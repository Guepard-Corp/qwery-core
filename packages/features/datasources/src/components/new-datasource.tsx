import { PlusCircle } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

type NewDatasourceProps = {
  onClick: () => void;
  showLabel?: boolean;
};

export const NewDatasource = ({
  onClick,
  showLabel = true,
}: NewDatasourceProps) => {
  return (
    <Button
      data-testid="new-datasource"
      size="sm"
      className="text-primary dark:text-primary-foreground hover:text-primary-foreground cursor-pointer bg-[#ffcb51]"
      onClick={onClick}
      aria-label={showLabel ? undefined : 'Create a new datasource'}
      title={showLabel ? undefined : 'Create a new datasource'}
    >
      <PlusCircle className={cn('w-4', showLabel && 'mr-2')} />
      {showLabel && (
        <span>
          <Trans i18nKey="datasources:newDatasource" />
        </span>
      )}
    </Button>
  );
};
