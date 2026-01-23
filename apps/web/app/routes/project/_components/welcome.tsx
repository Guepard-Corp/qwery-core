import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronRightIcon, Link2Icon, PlusIcon } from '@radix-ui/react-icons';
import { Database, Sparkles, ArrowRight, Layers, NotebookPen, ArrowUp, Play } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { LogoImage } from '~/components/app-logo';

import { PlaygroundTry } from '@qwery/playground/playground-try';
import {
  getRandomizedSuggestions,
  type PlaygroundSuggestion,
} from '@qwery/playground/playground-suggestions';
import { PLAYGROUND_TABLES } from '@qwery/playground/utils/playground-sql';
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@qwery/ui/ai-elements';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@qwery/ui/hover-card';
import { Button } from '@qwery/ui/button';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useConversation } from '~/lib/mutations/use-conversation';
import { usePlayground } from '~/lib/mutations/use-playground';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';

export default function WelcomePage() {
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;
  const { workspace, repositories } = useWorkspace();
  const [input, setInput] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaygroundSuggestion | null>(null);
  const [brandText, setBrandText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const project = useGetProjectBySlug(repositories.project, project_id);

  const suggestions = useMemo(() => getRandomizedSuggestions(3), []);

  const createPlaygroundMutation = usePlayground(
    repositories.datasource,
    () => { },
    (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create playground', { id: 'creating-playground' });
    },
  );

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      const messageText = input.trim();
      if (messageText) {
        localStorage.setItem(`pending-message-${conversation.slug}`, messageText);
      }
      setInput('');
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create conversation', { id: 'creating-conversation' });
    },
    workspace.projectId,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => setScrolled(container.scrollTop > 20);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const targetText = 'query';
    const finalText = 'qwery';
    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const typeText = (text: string, callback: () => void) => {
      if (currentIndex < text.length) {
        setBrandText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(() => typeText(text, callback), 100);
      } else {
        callback();
      }
    };

    const deleteText = (callback: () => void) => {
      if (currentIndex > 0) {
        setBrandText(targetText.slice(0, currentIndex - 1));
        currentIndex--;
        timeoutId = setTimeout(() => deleteText(callback), 50);
      } else {
        callback();
      }
    };

    const startAnimation = () => {
      currentIndex = 0;
      setBrandText('');
      setShowCursor(true);
      typeText(targetText, () => {
        setTimeout(() => {
          currentIndex = targetText.length;
          deleteText(() => {
            currentIndex = 0;
            typeText(finalText, () => {
              setTimeout(() => setShowCursor(false), 500);
            });
          });
        }, 1000);
      });
    };

    startAnimation();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() || !project.data || !workspace.userId) return;

    const messageText = message.text.trim();

    // Show notification about redirection
    toast.loading('Creating conversation and redirecting...', { id: 'creating-conversation' });

    createConversationMutation.mutate({
      projectId: project.data.id,
      taskId: uuidv4(),
      title: messageText.substring(0, 50) || 'New Conversation',
      seedMessage: messageText,
      datasources: [],
      createdBy: workspace.userId,
    });

  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
      e.preventDefault();
      handleSubmit({ text: input.trim(), files: [] });
    }
  };

  const handleSuggestionClick = (suggestion: PlaygroundSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlayground = async () => {
    if (!selectedSuggestion || !project.data || !workspace.userId) return;

    setShowConfirmDialog(false);
    toast.loading('Creating playground...', { id: 'creating-playground' });

    try {
      const playgroundDatasource = await createPlaygroundMutation.mutateAsync({
        playgroundId: 'pglite',
        projectId: project.data.id,
      });

      toast.dismiss('creating-playground');
      toast.loading('Creating conversation...', { id: 'creating-conversation' });

      setInput(selectedSuggestion.query);

      createConversationMutation.mutate(
        {
          projectId: project.data.id,
          taskId: uuidv4(),
          title: selectedSuggestion.query.substring(0, 50) || 'New Conversation',
          seedMessage: selectedSuggestion.query,
          datasources: [playgroundDatasource.id],
          createdBy: workspace.userId,
        },
        {
          onSuccess: (conversation) => {
            toast.dismiss('creating-conversation');
            localStorage.setItem(`pending-message-${conversation.slug}`, selectedSuggestion.query);
            localStorage.setItem(`pending-datasource-${conversation.slug}`, playgroundDatasource.id);
            setInput('');
            navigate(createPath(pathsConfig.app.conversation, conversation.slug));
          },
          onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to create conversation', { id: 'creating-conversation' });
          },
        },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create playground', { id: 'creating-playground' });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">

        {/* HERO SECTION */}
        <section className="text-center space-y-5 mb-16">
          {/* Qwery Logo & Brand */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <LogoImage size="2xl" width={256} />
            <span className="text-4xl font-black tracking-tighter uppercase text-foreground">
              {brandText || 'Q'}
              {showCursor && (
                <span className="inline-block w-0.5 h-8 bg-foreground animate-pulse ml-0.5" />
              )}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            What would you like to explore?
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Ask questions about your data in natural language
          </p>
        </section>

        {/* PRIMARY CHAT INPUT */}
        <section className="mb-12">
          <PromptInput
            onSubmit={handleSubmit}
            className="bg-card border border-border/60 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            globalDrop
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your data..."
                className="min-h-[120px] text-[15px] border-none focus-visible:ring-0 resize-none px-4 py-4"
              />
            </PromptInputBody>
            <PromptInputFooter className="px-3 py-2.5 bg-muted/20 border-t border-border/40">
              <PromptInputTools />
              <PromptInputSubmit
                disabled={!input.trim() || createConversationMutation.isPending}
                className="bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90"
              >
                <ArrowUp className="size-4" />
                <span className="hidden sm:inline">qwery</span>
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>

          {/* Example prompts */}
          <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="cursor-pointer text-sm px-4 py-2.5 rounded-md border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:border-foreground dark:hover:border-white transition-colors"
              >
                {suggestion.query}
              </button>
            ))}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground/70">Quick Actions</span>
          </div>
        </div>

        {/* ACTION CARDS */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Link
            to={createPath(pathsConfig.app.availableSources, project_id)}
            className="group flex flex-col justify-between rounded-2xl border bg-card p-8 transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Link2Icon className="size-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Connect Datasources</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Link PostgreSQL, MySQL, ClickHouse, Google Sheets, CSV files, and more. Automatic schema mapping and federated queries.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 font-bold text-sm tracking-tight text-primary uppercase">
              Connect Data <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to={createPath(pathsConfig.app.projectNotebooks, project_id)}
            className="group flex flex-col justify-between rounded-2xl border bg-card p-8 transition-all hover:border-primary hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <NotebookPen className="size-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Create Notebooks</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Build SQL notebooks to query, analyze, and visualize data. Organize queries into cells and run federated queries.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 font-bold text-sm tracking-tight text-primary uppercase">
              Start Notebook <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground/70">Sample Data</span>
          </div>
        </div>

        {/* PLAYGROUND SECTION */}
        <section className="space-y-4 pb-12">
          <div className="overflow-hidden bg-card cursor-pointer">
            <PlaygroundTry onClick={() => navigate(createPath(pathsConfig.app.projectPlayground, project_id))} />
          </div>
        </section>
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Play className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 space-y-1 pt-1">
                <AlertDialogTitle className="text-xl font-semibold leading-tight">
                  Start with Playground
                </AlertDialogTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A new playground database will be created with sample data
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="pb-4">
              <p className="text-xs font-medium text-foreground mb-3 text-center">Available tables:</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {PLAYGROUND_TABLES.map((table) => (
                  <HoverCard key={table.name} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 px-3.5 py-2 text-xs font-medium text-foreground border border-border/50 hover:bg-muted hover:border-border transition-colors cursor-pointer"
                      >
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        {table.name}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="top"
                      align="center"
                      sideOffset={8}
                      className="w-80 p-0"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold text-sm capitalize">{table.name}</h4>
                        </div>
                        {table.description && (
                          <p className="text-xs text-muted-foreground">{table.description}</p>
                        )}
                        {table.sampleData && table.sampleData.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Sample data:</p>
                            <div className="rounded-md border bg-muted/30 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-muted/50 border-b">
                                    <tr>
                                      {table.sampleData[0] && Object.keys(table.sampleData[0]).map((key) => (
                                        <th
                                          key={key}
                                          className="px-2.5 py-1.5 text-left font-medium text-foreground capitalize"
                                        >
                                          {key.replace(/_/g, ' ')}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.sampleData.slice(0, 3).map((row, idx) => (
                                      <tr
                                        key={idx}
                                        className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                                      >
                                        {row && Object.values(row).map((value, cellIdx) => (
                                          <td
                                            key={cellIdx}
                                            className="px-2.5 py-1.5 text-muted-foreground"
                                          >
                                            {String(value)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl border-2 border-dashed bg-muted/30 p-4">
              <span className="absolute -top-2.5 left-4 bg-background px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Your Request
              </span>
              <p className="text-sm font-semibold italic text-foreground leading-relaxed">
                "{selectedSuggestion?.query}"
              </p>
            </div>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={createPlaygroundMutation.isPending || createConversationMutation.isPending}
              className="mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPlayground}
              disabled={createPlaygroundMutation.isPending || createConversationMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createPlaygroundMutation.isPending || createConversationMutation.isPending
                ? 'Creating...'
                : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}