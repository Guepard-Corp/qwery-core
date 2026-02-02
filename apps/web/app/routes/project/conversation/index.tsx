import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useConversation } from '~/lib/mutations/use-conversation';
import { useGetConversationsByProject } from '~/lib/queries/use-get-conversations-by-project';
import { createPath } from '~/config/paths.config';
import pathsConfig from '~/config/paths.config';
import { useState, useMemo } from 'react';
import {
  MessageCircle,
  ClockIcon,
  Sparkles,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@qwery/ui/utils';
import { Button } from '@qwery/ui/button';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year} at ${timeStr}`;
}

export default function ConversationIndexPage() {
  const { repositories, workspace } = useWorkspace();
  const { projectId, project, isLoading: isProjectLoading } = useProject();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const { data: allConversations = [], isLoading: isLoadingConversations } =
    useGetConversationsByProject(
      repositories.conversation,
      projectId ?? undefined,
    );

  const sortedConversations = useMemo(
    () =>
      [...allConversations].sort((a, b) => {
        const dateA =
          a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
        const dateB =
          b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
        return dateB.getTime() - dateA.getTime();
      }),
    [allConversations],
  );

  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedConversations.slice(startIndex, endIndex);
  }, [sortedConversations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedConversations.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(
        `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    },
    projectId,
  );

  const handleConversationClick = (conv: { slug: string }) => {
    navigate(createPath(pathsConfig.app.conversation, conv.slug));
  };

  const handleNewChat = () => {
    if (!projectId || !project) {
      toast.error('Project not found');
      return;
    }

    if (!repositories.conversation) {
      toast.error('Conversation repository not available');
      return;
    }

    if (!workspace.userId) {
      toast.error('User not authenticated');
      return;
    }

    createConversationMutation.mutate({
      projectId,
      taskId: uuidv4(),
      title: 'New Conversation',
      seedMessage: '',
      datasources: [],
      createdBy: workspace.userId,
    });
  };

  const isLoading = isLoadingConversations || isProjectLoading;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center px-4 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-12">
        <div className="flex h-48 flex-col items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-[#ffcb51]/10">
                <Sparkles className="size-8 text-[#ffcb51]" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Start a new conversation
              </h1>
              <p className="text-muted-foreground text-lg">
                Ask anything or describe what you&apos;d like to explore
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[400px] flex-col">
          {sortedConversations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <ClockIcon className="text-muted-foreground size-4" />
                <h2 className="text-muted-foreground my-2 text-sm font-semibold tracking-wide uppercase">
                  Recent Conversations
                </h2>
              </div>
              <div className="mx-auto w-full max-w-2xl space-y-2">
                {paginatedConversations.map((conversation) => {
                  const updatedAt =
                    conversation.updatedAt instanceof Date
                      ? conversation.updatedAt
                      : new Date(conversation.updatedAt);
                  const timeLabel = formatRelativeTime(updatedAt);

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className={cn(
                        'group bg-card flex w-full cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 text-left transition-all',
                        'hover:bg-accent/50 hover:border-[#ffcb51]/20 hover:shadow-sm',
                        'focus-visible:ring-2 focus-visible:ring-[#ffcb51]/20 focus-visible:outline-none',
                      )}
                    >
                      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-[#ffcb51]/10 group-hover:text-[#ffcb51]">
                        <MessageCircle className="size-5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-semibold">
                          {conversation.title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {timeLabel}
                        </span>
                      </div>
                      <ArrowRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={!hasPrevPage}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Previous</span>
                  </Button>
                  <span className="text-muted-foreground text-xs font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={!hasNextPage}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Next</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
                <MessageCircle className="text-muted-foreground size-6" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  No conversations yet
                </p>
                <p className="text-muted-foreground text-xs">
                  Start a new conversation to get started
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleNewChat}
            size="lg"
            variant="outline"
            className="gap-2"
            disabled={createConversationMutation.isPending || isLoading || !project}
          >
            <Plus className="size-4" />
            Start a new conversation
          </Button>
        </div>
      </div>
    </div>
  );
}
