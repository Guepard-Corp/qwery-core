'use client';

import { Link } from 'react-router';

import { FileText } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { PageTopBar } from '@qwery/ui/page';

import { AppLogo } from '~/components/app-logo';
import { OrgBreadcrumb } from './org-breadcrumb';

export function OrgLayoutTopBar() {
  return (
    <PageTopBar>
      <div className="flex items-center space-x-4">
        <AppLogo className="w-7 h-7" />
        <OrgBreadcrumb />
      </div>
      <div className="flex items-center space-x-4">
        <Button asChild size="icon" variant="ghost">
          <Link
            to="https://docs.qwery.run"
            target="_blank"
            data-test="docs-link"
            rel="noopener noreferrer"
          >
            <FileText className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </PageTopBar>
  );
}

