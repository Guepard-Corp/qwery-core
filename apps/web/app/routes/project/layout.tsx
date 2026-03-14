import { Outlet, useSearchParams, useLocation } from 'react-router';
import { useEffect, useRef, useState, useMemo } from 'react';

import { Page, PageFooter, PageNavigation, AgentSidebar } from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/project/+types/layout';
import type { ResizableContentRef } from '@qwery/ui/page';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { ProjectSidebar } from './_components/project-sidebar';
import { ProjectBreadcrumb } from './_components/project-breadcrumb';
import { AgentUIWrapper } from './_components/agent-ui-wrapper';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { AgentStatusProvider } from '@qwery/ui/ai';
import { LeaveConfirmationProvider } from '~/lib/context/leave-confirmation-context';
import { useGetMessagesByConversationSlug } from '~/lib/queries/use-get-messages';
import {
  NotebookSidebarProvider,
  useNotebookSidebar,
} from '~/lib/context/notebook-sidebar-context';
import { ProjectProvider, ProjectGuard } from '~/lib/context/project-context';
import { useNotebookSidebarOpenStore } from '~/lib/store/use-notebook-sidebar-open';
import { ProjectPausedOverlay } from './_components/project-paused-overlay';

// LocalStorage key for persisting notebook sidebar conversation
const NOTEBOOK_SIDEBAR_CONVERSATION_KEY = 'notebook-sidebar-conversation';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return {
    layoutState: {
      open: true,
    },
  };
}

function SidebarLayoutInner(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  const { layoutState } = props.loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { repositories } = useWorkspace();
  const sidebarRef = useRef<ResizableContentRef>(null);
  const { registerSidebarControl } = useNotebookSidebar();
  const { open: notebookSidebarOpen, setOpen: setNotebookSidebarOpen } =
    useNotebookSidebarOpenStore();
  const [persistedConversationSlug, setPersistedConversationSlug] = useState<
    string | null
  >(null);

  // Note: We intentionally do NOT sync workspace context with URL here.
  // Components use URL-derived project data directly via useGetProjectBySlug.
  // The workspace context provides userId and repositories only.
  // This prevents feedback loops and flickering when navigating between projects.

  // Only enable notebook sidebar behavior on notebook pages
  const isNotebookPage = location.pathname.startsWith('/notebook/');

  // Get conversation slug from URL params (for notebook chat integration)
  const conversationSlugFromUrl = searchParams.get('conversation');

  // Load persisted conversation slug from localStorage on mount
  // Restore to URL if it's not already there and we're on a notebook page
  // This ensures the sidebar opens correctly on refresh
  useEffect(() => {
    if (isNotebookPage && typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem(
          NOTEBOOK_SIDEBAR_CONVERSATION_KEY,
        );
        if (persisted) {
          setPersistedConversationSlug(persisted);
          // Restore conversation param to URL if not present
          // This ensures sidebar opens on refresh
          if (!conversationSlugFromUrl && persisted) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('conversation', persisted);
            window.history.replaceState(
              {},
              '',
              currentUrl.pathname + currentUrl.search,
            );
            // Update searchParams to trigger re-render
            setSearchParams(new URLSearchParams(currentUrl.searchParams), {
              replace: true,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load persisted conversation slug:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotebookPage]); // Only run on mount and when notebook page changes

  // Persist conversation slug to localStorage when it changes
  // Also clear it when conversation param is removed from URL (user closed sidebar)
  useEffect(() => {
    if (isNotebookPage && typeof window !== 'undefined') {
      try {
        if (conversationSlugFromUrl) {
          localStorage.setItem(
            NOTEBOOK_SIDEBAR_CONVERSATION_KEY,
            conversationSlugFromUrl,
          );
          setPersistedConversationSlug(conversationSlugFromUrl);
        } else if (!conversationSlugFromUrl && persistedConversationSlug) {
          localStorage.removeItem(NOTEBOOK_SIDEBAR_CONVERSATION_KEY);
          setPersistedConversationSlug(null);
        }
      } catch (error) {
        console.error('Failed to persist conversation slug:', error);
      }
    }
  }, [isNotebookPage, conversationSlugFromUrl, persistedConversationSlug]);

  const conversationSlug = useMemo(() => {
    return conversationSlugFromUrl || persistedConversationSlug || 'default';
  }, [conversationSlugFromUrl, persistedConversationSlug]);

  const conversationKey = useMemo(() => {
    const actualSlug = conversationSlug !== 'default' ? conversationSlug : null;
    return actualSlug || 'no-conversation';
  }, [conversationSlug]);

  const agentWrapperRef = useRef<{
    sendMessage: (text: string) => void;
  } | null>(null);

  // Register sidebar control for notebook pages only
  useEffect(() => {
    if (isNotebookPage && sidebarRef.current) {
      registerSidebarControl({
        open: () => sidebarRef.current?.open(),
        sendMessage: (text: string) => {
          agentWrapperRef.current?.sendMessage(text);
        },
      });
    }
  }, [isNotebookPage, registerSidebarControl]);

  const hasOpenedOnMountRef = useRef(false);

  useEffect(() => {
    if (isNotebookPage && sidebarRef.current && !hasOpenedOnMountRef.current) {
      const hasConversation =
        conversationSlugFromUrl || persistedConversationSlug;
      if (hasConversation && conversationSlug !== 'default') {
        if (notebookSidebarOpen === false) {
          hasOpenedOnMountRef.current = true;
          return;
        }
        const timeoutId = setTimeout(() => {
          sidebarRef.current?.open();
          hasOpenedOnMountRef.current = true;
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    isNotebookPage,
    conversationSlugFromUrl,
    persistedConversationSlug,
    conversationSlug,
    notebookSidebarOpen,
  ]);

  // Reset the mount flag when navigating to a different notebook
  useEffect(() => {
    hasOpenedOnMountRef.current = false;
  }, [location.pathname]);

  const messages = useGetMessagesByConversationSlug(
    repositories.conversation,
    repositories.message,
    conversationSlug,
    {
      enabled: isNotebookPage && conversationSlug !== 'default',
    },
  );

  return (
    <AgentStatusProvider>
      <LeaveConfirmationProvider>
        <SidebarProvider defaultOpen={layoutState.open}>
          <Page
            agentSidebarOpen={isNotebookPage ? notebookSidebarOpen : undefined}
            agentSidebarRef={isNotebookPage ? sidebarRef : undefined}
            agentSidebarOnOpenChange={
              isNotebookPage ? setNotebookSidebarOpen : undefined
            }
          >
            <PageNavigation>
              <ProjectSidebar />
            </PageNavigation>
            <PageFooter>
              <LayoutFooter />
            </PageFooter>
            {isNotebookPage && conversationSlug !== 'default' && (
              <AgentSidebar>
                <AgentUIWrapper
                  key={conversationKey}
                  ref={agentWrapperRef}
                  conversationSlug={conversationSlug}
                  initialMessages={messages.data}
                  isMessagesLoading={messages.isLoading}
                />
              </AgentSidebar>
            )}
            <div className="flex h-full flex-col">
              <div className="bg-background w-fit px-4 pt-4 pb-3 lg:px-12 lg:pt-6">
                <ProjectBreadcrumb />
              </div>
              <div className="flex-1 overflow-hidden">{props.children}</div>
            </div>
          </Page>
        </SidebarProvider>
      </LeaveConfirmationProvider>
    </AgentStatusProvider>
  );
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  return (
    <ProjectProvider>
      <ProjectGuard>
        <ProjectPausedOverlay />
        <NotebookSidebarProvider>
          <SidebarLayoutInner {...props} />
        </NotebookSidebarProvider>
      </ProjectGuard>
    </ProjectProvider>
  );
}

function SimpleModeSidebarLayout(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  return (
    <ProjectProvider>
      <ProjectGuard>
        <ProjectPausedOverlay />
        <AgentStatusProvider>
          <SidebarProvider defaultOpen={true}>
            <Page>
              <PageNavigation>
                <ProjectSidebar />
              </PageNavigation>
              <PageFooter>
                <LayoutFooter />
              </PageFooter>
              <div className="flex h-full flex-col">
                <div className="bg-background w-fit px-4 pt-4 pb-3 lg:px-12 lg:pt-6">
                  <ProjectBreadcrumb />
                </div>
                <div className="flex-1 overflow-hidden">{props.children}</div>
              </div>
            </Page>
          </SidebarProvider>
        </AgentStatusProvider>
      </ProjectGuard>
    </ProjectProvider>
  );
}

export default function Layout(props: Route.ComponentProps) {
  const { workspace } = useWorkspace();
  const SideBar =
    workspace.mode === WorkspaceModeEnum.SIMPLE
      ? SimpleModeSidebarLayout
      : SidebarLayout;
  return (
    <SideBar {...props}>
      <Outlet />
    </SideBar>
  );
}
