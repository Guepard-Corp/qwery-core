import { PlusCircle } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';

export const NewDatasource = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button
      data-testid="new-datasource"
      size="sm"
      className="text-primary dark:text-primary-foreground hover:text-primary-foreground cursor-pointer bg-[#ffcb51]"
      onClick={onClick}
    >
      <PlusCircle className="mr-2 w-4" />
      <span>
        <Trans i18nKey="datasources:newDatasource" />
      </span>
    </Button>
  );
};
