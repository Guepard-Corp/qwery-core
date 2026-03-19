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

function SidebarLayoutInner(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  const layoutState = { open: true } as const;
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
  const persistedConversationSlugRef = useRef<string | null>(null);
  const hasRestoredConversationSlugRef = useRef(false);

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
          persistedConversationSlugRef.current = persisted;
          setPersistedConversationSlug(persisted);

          // Restore conversation param to URL if not present.
          // Use React Router's setSearchParams (avoid direct window.history mutation).
          if (!conversationSlugFromUrl) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('conversation', persisted);
            setSearchParams(nextParams, { replace: true });
            hasRestoredConversationSlugRef.current = true;
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
          persistedConversationSlugRef.current = conversationSlugFromUrl;
          setPersistedConversationSlug(conversationSlugFromUrl);
          hasRestoredConversationSlugRef.current = false;
          return;
        }

        // conversationSlugFromUrl is falsy here (param removed or missing).
        // Skip removal during the initial "hydrate from localStorage" cycle.
        if (hasRestoredConversationSlugRef.current) {
          hasRestoredConversationSlugRef.current = false;
          return;
        }

        if (persistedConversationSlugRef.current) {
          localStorage.removeItem(NOTEBOOK_SIDEBAR_CONVERSATION_KEY);
          persistedConversationSlugRef.current = null;
          setPersistedConversationSlug(null);
        }
      } catch (error) {
        console.error('Failed to persist conversation slug:', error);
      }
    }
  }, [isNotebookPage, conversationSlugFromUrl]);

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
              <div
                className={
                  isNotebookPage
                    ? 'flex-1 overflow-hidden'
                    : 'flex-1 overflow-hidden px-8 lg:px-48'
                }
              >
                {props.children}
              </div>
            </div>
          </Page>
        </SidebarProvider>
      </LeaveConfirmationProvider>
    </AgentStatusProvider>
  );
}

function ProjectLayoutWrapper({ children }: React.PropsWithChildren) {
  return (
    <ProjectProvider>
      <ProjectGuard>
        <ProjectPausedOverlay />
        {children}
      </ProjectGuard>
    </ProjectProvider>
  );
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  return (
    <ProjectLayoutWrapper>
      <NotebookSidebarProvider>
        <SidebarLayoutInner {...props} />
      </NotebookSidebarProvider>
    </ProjectLayoutWrapper>
  );
}

function SimpleModeSidebarLayout(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  const location = useLocation();
  const isNotebookPage = location.pathname.startsWith('/notebook/');

  return (
    <ProjectLayoutWrapper>
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
              <div
                className={
                  isNotebookPage
                    ? 'flex-1 overflow-hidden'
                    : 'flex-1 overflow-hidden px-64'
                }
              >
                {props.children}
              </div>
            </div>
          </Page>
        </SidebarProvider>
      </AgentStatusProvider>
    </ProjectLayoutWrapper>
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
