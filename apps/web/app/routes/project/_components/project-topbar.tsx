'use client';

import { Link } from 'react-router';

import { FileText } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { PageTopBar } from '@qwery/ui/page';

import { AppLogo } from '~/components/app-logo';
import { SidebarTrigger } from '@qwery/ui/shadcn-sidebar';
import { WorkspaceModeSwitch } from '@qwery/ui/workspace-mode-switch';
import { useSwitchWorkspaceMode } from '~/lib/hooks/use-workspace-mode';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { useWorkspace } from '~/lib/context/workspace-context';
import { ProjectConversationHistory } from './project-conversation-history';
import { ProjectBreadcrumb } from './project-breadcrumb';

export function ProjectLayoutTopBar() {
  const { workspace } = useWorkspace();
  const { mutate: switchWorkspaceMode } = useSwitchWorkspaceMode();

  const handleSwitchWorkspaceMode = (mode: string) => {
    switchWorkspaceMode(mode as WorkspaceModeEnum, {
      onSuccess: () => {
        window.location.reload();
      },
    });
  };
  return (
    <PageTopBar>
      <div className="flex items-center space-x-4">
        <AppLogo className="h-7 w-7" />
        {workspace.mode === WorkspaceModeEnum.SIMPLE ? null : (
          <SidebarTrigger className="lg:hidden" />
        )}
        <ProjectBreadcrumb />
      </div>
      <div className="flex items-center space-x-4">
        <ProjectConversationHistory />
        <WorkspaceModeSwitch
          onChange={handleSwitchWorkspaceMode}
          defaultMode={
            workspace.mode === WorkspaceModeEnum.ADVANCED
              ? 'advanced'
              : 'simple'
          }
        />
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
