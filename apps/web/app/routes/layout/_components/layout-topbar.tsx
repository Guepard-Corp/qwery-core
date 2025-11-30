'use client';

import { Link } from 'react-router';

import { FileText } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { PageTopBar } from '@qwery/ui/page';

import { AppLogo } from '~/components/app-logo';

export function LayoutTopBar() {
  return (
    <PageTopBar>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center space-x-4">
          <AppLogo />
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
      </div>
    </PageTopBar>
  );
}
