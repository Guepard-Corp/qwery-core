import { Outlet, useSearchParams, useLocation } from 'react-router';
import { useEffect, useRef, useState, useMemo } from 'react';

import {
  Page,
  PageFooter,
  PageMobileNavigation,
  PageNavigation,
  PageTopNavigation,
  AgentSidebar,
} from '@qwery/ui/page';
import { SidebarProvider } from '@qwery/ui/shadcn-sidebar';
import type { Route } from '~/types/app/routes/project/+types/layout';
import type { ResizableContentRef } from '@qwery/ui/page';

import { LayoutFooter } from '../layout/_components/layout-footer';
import { LayoutMobileNavigation } from '../layout/_components/layout-mobile-navigation';
import { ProjectLayoutTopBar } from './_components/project-topbar';
import { ProjectSidebar } from './_components/project-sidebar';
import { AgentUIWrapper } from './_components/agent-ui-wrapper';
import { useWorkspace } from '~/lib/context/workspace-context';
import { WorkspaceModeEnum } from '@qwery/domain/enums';
import { AgentTabs, AgentStatusProvider } from '@qwery/ui/ai';
import { useGetMessagesByConversationSlug } from '~/lib/queries/use-get-messages';
import {
  NotebookSidebarProvider,
  useNotebookSidebar,
} from '~/lib/context/notebook-sidebar-context';
import { ProjectProvider } from '~/lib/context/project-context';
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
          // Don't clear persisted conversation on URL removal - keep it for refresh
          // Only clear if user explicitly navigates away from notebook
          // This allows sidebar to reopen with same conversation on refresh
        }
      } catch (error) {
        console.error('Failed to persist conversation slug:', error);
      }
    }
  }, [isNotebookPage, conversationSlugFromUrl, persistedConversationSlug]);

  // Determine the conversation slug to use
  // Priority: URL param > persisted > 'default'
  const conversationSlug = useMemo(() => {
    return conversationSlugFromUrl || persistedConversationSlug || 'default';
  }, [conversationSlugFromUrl, persistedConversationSlug]);

  // Stable key for AgentUIWrapper - only changes when conversation actually changes
  // This prevents unnecessary remounts while allowing remount when switching conversations
  const conversationKey = useMemo(() => {
    // Use a stable key that only changes when the actual conversation slug changes
    // 'default' is not a real conversation, so don't use it as a key
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

  // Track if we've already attempted to open the sidebar on this mount
  // This prevents reopening when user manually closes it
  const hasOpenedOnMountRef = useRef(false);

  // Open sidebar on mount/refresh when conversation param is present
  // Only open once on initial mount, not on every conversation change
  useEffect(() => {
    if (isNotebookPage && sidebarRef.current && !hasOpenedOnMountRef.current) {
      // Check if we should open based on URL or persisted conversation
      const hasConversation =
        conversationSlugFromUrl || persistedConversationSlug;
      if (hasConversation && conversationSlug !== 'default') {
        // Small delay to ensure everything is mounted
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
  ]);

  // Reset the mount flag when navigating to a different notebook
  useEffect(() => {
    hasOpenedOnMountRef.current = false;
  }, [location.pathname]);

  // Load messages for the conversation when slug changes (only on notebook pages)
  // Always fetch messages when conversation slug exists, regardless of sidebar state
  // This ensures content is available when sidebar is opened
  // Use the resolved conversationSlug (from URL or persisted) instead of just URL param
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
      <SidebarProvider defaultOpen={layoutState.open}>
        <Page
          agentSidebarOpen={undefined}
          agentSidebarRef={isNotebookPage ? sidebarRef : undefined}
        >
          <PageTopNavigation>
            <ProjectLayoutTopBar />
          </PageTopNavigation>
          <PageNavigation>
            <ProjectSidebar />
          </PageNavigation>
          <PageMobileNavigation className={'flex items-center justify-between'}>
            <LayoutMobileNavigation />
          </PageMobileNavigation>
          <PageFooter>
            <LayoutFooter />
          </PageFooter>
          {/* Always render AgentSidebar on notebook pages to keep it mounted and preserve state */}
          {/* The ResizableContent component will handle hiding it when closed */}
          {/* Use stable key that only changes when conversation actually changes */}
          {/* CRITICAL: Always render when we have a conversation (from URL or persisted) */}
          {/* This ensures content is preserved when sidebar is closed */}
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
          {props.children}
        </Page>
      </SidebarProvider>
    </AgentStatusProvider>
  );
}

function SidebarLayout(props: Route.ComponentProps & React.PropsWithChildren) {
  return (
    <ProjectProvider>
      <ProjectPausedOverlay />
      <NotebookSidebarProvider>
        <SidebarLayoutInner {...props} />
      </NotebookSidebarProvider>
    </ProjectProvider>
  );
}

function SimpleModeSidebarLayout(
  props: Route.ComponentProps & React.PropsWithChildren,
) {
  return (
    <ProjectProvider>
      <ProjectPausedOverlay />
      <AgentStatusProvider>
        <Page>
          <PageTopNavigation>
            <ProjectLayoutTopBar />
          </PageTopNavigation>
          <PageMobileNavigation className={'flex items-center justify-between'}>
            <LayoutMobileNavigation />
          </PageMobileNavigation>
          <PageFooter>
            <LayoutFooter />
          </PageFooter>
          <AgentSidebar>
            <AgentTabs
              tabs={[
                {
                  id: 'query-sql-results',
                  title: 'Results',
                  description: 'Query SQL Results',
                  component: <div>Query SQL Results</div>,
                },
                {
                  id: 'query-sql-visualisation',
                  title: 'Visualisation',
                  description: 'Visualisation of the query SQL results',
                  component: <div>Query SQL Results</div>,
                },
              ]}
            />
          </AgentSidebar>
          {props.children}
        </Page>
      </AgentStatusProvider>
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
