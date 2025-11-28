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
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center space-x-4">
          <AppLogo />
          {workspace.mode === WorkspaceModeEnum.SIMPLE ? null : (
            <SidebarTrigger className="lg:hidden" />
          )}
          <WorkspaceModeSwitch
            onChange={handleSwitchWorkspaceMode}
            defaultMode={
              workspace.mode === WorkspaceModeEnum.ADVANCED
                ? 'advanced'
                : 'simple'
            }
          />
        </div>
        <div className="flex items-center space-x-4">
          <ProjectConversationHistory />
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
