import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Link2Icon } from '@radix-ui/react-icons';
import { ArrowRight, NotebookPen, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { LogoImage } from '~/components/app-logo';

import { PlaygroundTry } from '@qwery/playground/playground-try';
import {
  getRandomizedSuggestions,
  type PlaygroundSuggestion,
} from '@qwery/playground/playground-suggestions';
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@qwery/ui/ai-elements';
import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useConversation } from '~/lib/mutations/use-conversation';
import { getErrorKey } from '~/lib/utils/error-key';
import { usePlayground } from '~/lib/mutations/use-playground';

import { PlaygroundConfirmDialog } from './playground-confirm-dialog';

export default function WelcomePage() {
  const { t } = useTranslation('welcome');
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;
  const { workspace, repositories } = useWorkspace();
  const { projectId } = useProject();
  const [input, setInput] = useState('');
  const _containerRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaygroundSuggestion | null>(null);
  const [brandText, setBrandText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const suggestions = useMemo(() => getRandomizedSuggestions(3), []);

  const createPlaygroundMutation = usePlayground(
    repositories.datasource,
    () => {},
    (error) => {
      toast.error(getErrorKey(error, t), {
        id: 'creating-playground',
      });
    },
  );

  const createConversationMutation = useConversation(
    repositories.conversation,
    (conversation) => {
      const messageText = input.trim();
      if (messageText) {
        localStorage.setItem(
          `pending-message-${conversation.slug}`,
          messageText,
        );
      }
      setInput('');
      navigate(createPath(pathsConfig.app.conversation, conversation.slug));
    },
    (error) => {
      toast.error(getErrorKey(error, t), {
        id: 'creating-conversation',
      });
    },
    projectId ?? undefined,
  );

  useEffect(() => {
    const targetText = 'Query';
    const finalText = 'Qwery';
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
    if (!message.text?.trim() || !projectId || !workspace.userId) return;

    const messageText = message.text.trim();

    toast.loading(t('creatingConversationRedirect'), {
      id: 'creating-conversation',
    });

    createConversationMutation.mutate({
      projectId,
      taskId: uuidv4(),
      title: messageText.substring(0, 50) || t('newConversation'),
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
    if (!selectedSuggestion || !projectId || !workspace.userId) return;

    setShowConfirmDialog(false);
    toast.loading(t('creatingPlayground'), { id: 'creating-playground' });

    try {
      const playgroundDatasource = await createPlaygroundMutation.mutateAsync({
        playgroundId: 'pglite',
        projectId,
      });

      toast.dismiss('creating-playground');
      toast.loading('Creating conversation...', {
        id: 'creating-conversation',
      });

      setInput(selectedSuggestion.query);

      createConversationMutation.mutate(
        {
          projectId,
          taskId: uuidv4(),
          title:
            selectedSuggestion.query.substring(0, 50) || t('newConversation'),
          seedMessage: selectedSuggestion.query,
          datasources: [playgroundDatasource.id],
          createdBy: workspace.userId,
        },
        {
          onSuccess: (conversation) => {
            toast.dismiss('creating-conversation');
            localStorage.setItem(
              `pending-message-${conversation.slug}`,
              selectedSuggestion.query,
            );
            localStorage.setItem(
              `pending-datasource-${conversation.slug}`,
              playgroundDatasource.id,
            );
            setInput('');
            navigate(
              createPath(pathsConfig.app.conversation, conversation.slug),
            );
          },
          onError: (error) => {
            toast.error(getErrorKey(error, t), {
              id: 'creating-conversation',
            });
          },
        },
      );
    } catch (error) {
      toast.error(getErrorKey(error, t), {
        id: 'creating-playground',
      });
    }
  };

  return (
    <div className="bg-background h-full overflow-y-auto">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        {/* HERO SECTION */}
        <section className="mb-16 space-y-5 text-center">
          {/* Qwery Logo & Brand */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <LogoImage size="2xl" _width={256} />
            <span className="text-foreground text-4xl font-black tracking-tighter uppercase">
              {brandText || 'Q'}
              {showCursor && (
                <span className="bg-foreground ml-0.5 inline-block h-8 w-0.5 animate-pulse" />
              )}
            </span>
          </div>

          <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-base sm:text-lg">
            {t('heroSubtitle')}
          </p>
        </section>

        {/* PRIMARY CHAT INPUT */}
        <section className="mb-12">
          <PromptInput
            onSubmit={handleSubmit}
            className="bg-card border-border/60 rounded-lg border shadow-sm transition-shadow hover:shadow-md"
            globalDrop
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="min-h-[120px] resize-none border-none px-4 py-4 text-[15px] focus-visible:ring-0"
              />
            </PromptInputBody>
            <PromptInputFooter className="bg-muted/20 border-border/40 border-t px-3 py-2.5">
              <PromptInputTools />
              <PromptInputSubmit
                disabled={!input.trim() || createConversationMutation.isPending}
                className="bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90"
              >
                <ArrowUp className="size-4" />
                <span className="hidden sm:inline">{t('askAi')}</span>
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>

          {/* Example prompts */}
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="border-border/50 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:border-foreground cursor-pointer rounded-md border px-4 py-2.5 text-sm transition-colors dark:hover:border-white"
              >
                {suggestion.query}
              </button>
            ))}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border/40 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground/70 px-3">
              {t('quickActions')}
            </span>
          </div>
        </div>

        {/* ACTION CARDS */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Link
            to={createPath(pathsConfig.app.availableSources, project_id)}
            className="group bg-card hover:border-primary hover:shadow-primary/5 flex cursor-pointer flex-col justify-between rounded-2xl border p-8 transition-all hover:shadow-2xl"
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg border transition-all">
                  <Link2Icon className="size-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {t('connectDatasources')}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('connectDatasourcesDescription')}
              </p>
            </div>
            <div className="text-primary mt-6 flex items-center gap-2 text-sm font-bold tracking-tight uppercase">
              {t('connectData')}{' '}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to={createPath(pathsConfig.app.projectNotebooks, project_id)}
            className="group bg-card hover:border-primary hover:shadow-primary/5 flex cursor-pointer flex-col justify-between rounded-2xl border p-8 transition-all hover:shadow-2xl"
          >
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg border transition-all">
                  <NotebookPen className="size-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {t('createNotebooks')}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('createNotebooksDescription')}
              </p>
            </div>
            <div className="text-primary mt-6 flex items-center gap-2 text-sm font-bold tracking-tight uppercase">
              {t('startNotebook')}{' '}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        {/* DIVIDER */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border/40 w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground/70 px-3">
              {t('sampleData')}
            </span>
          </div>
        </div>

        {/* PLAYGROUND SECTION */}
        <section className="space-y-4 pb-12">
          <div className="bg-card cursor-pointer overflow-hidden">
            <PlaygroundTry
              onClick={() =>
                navigate(
                  createPath(pathsConfig.app.projectPlayground, project_id),
                )
              }
            />
          </div>
        </section>
      </main>

      <PlaygroundConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedSuggestion={selectedSuggestion}
        onConfirm={handleConfirmPlayground}
        isPending={
          createPlaygroundMutation.isPending ||
          createConversationMutation.isPending
        }
      />
    </div>
  );
}
