import { useReducer, useEffect, useRef } from 'react';
import { createCliRenderer } from '@opentui/core';
import { createRoot, useKeyboard, useTerminalDimensions } from '@opentui/react';
import type { AppState } from './state/types.ts';
import type { Action } from './state/reducer.ts';
import { ThemeProvider } from './theme/index.ts';
import { initialState } from './state/initial.ts';
import { reducer, keyEventToKeyString } from './state/reducer.ts';
import { MainView } from './views/MainView.tsx';
import { ChatView } from './views/ChatView.tsx';
import { CommandPaletteView } from './views/CommandPaletteView.tsx';
import { HelpDialog } from './components/HelpDialog.tsx';
import { ConversationsDialog } from './components/ConversationsDialog.tsx';
import { ThemeDialog } from './components/ThemeDialog.tsx';
import { StashDialog } from './components/StashDialog.tsx';
import { AgentDialog } from './components/AgentDialog.tsx';
import { ModelDialog } from './components/ModelDialog.tsx';
import {
  ExportDialog,
  writeConversationToFile,
} from './components/ExportDialog.tsx';
import {
  ensureServerRunning,
  createConversation,
  sendChatMessage,
  parseStreamToChatMessage,
} from './server-client.ts';
import { getCurrentConversation } from './state/types.ts';

interface AppContentProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

function AppContent({ state, dispatch }: AppContentProps) {
  const { width, height } = useTerminalDimensions();
  const _pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dispatch({ type: 'resize', width, height });
  }, [dispatch, width, height]);

  useKeyboard((e) => {
    const key = keyEventToKeyString(e);
    if (key === 'ctrl+c') {
      process.exit(0);
      return;
    }
    if (
      key === 'q' &&
      state.activeDialog === 'none' &&
      state.currentScreen === 'home'
    ) {
      process.exit(0);
      return;
    }
    if (key === 'enter' && state.activeDialog === 'export') {
      writeConversationToFile(state).then((result) => {
        if (result.ok) {
          dispatch({
            type: 'export_confirm',
            filename: state.exportFilename,
            thinking: state.exportThinking,
            toolDetails: state.exportToolDetails,
          });
        }
      });
      return;
    }
    dispatch({ type: 'key', key });
  });

  useEffect(() => {
    if (!state.agentBusy) {
      if (loaderIntervalRef.current) {
        clearInterval(loaderIntervalRef.current);
        loaderIntervalRef.current = null;
      }
      return;
    }
    loaderIntervalRef.current = setInterval(() => {
      dispatch({ type: 'loader_tick' });
    }, 80);
    return () => {
      if (loaderIntervalRef.current) {
        clearInterval(loaderIntervalRef.current);
        loaderIntervalRef.current = null;
      }
    };
  }, [dispatch, state.agentBusy]);

  useEffect(() => {
    if (!state.pendingUserMessage) return;
    const prompt = state.pendingUserMessage;
    const startTime = Date.now();

    void (async () => {
      try {
        const baseUrl = await ensureServerRunning();
        const conv = getCurrentConversation(state);
        if (!conv) return;

        let slug = conv.slug;
        if (!slug) {
          const created = await createConversation(baseUrl, conv.title, prompt);
          slug = created.slug;
          dispatch({
            type: 'set_conversation_slug',
            conversationId: conv.id,
            slug,
          });
        }

        const messages = conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await sendChatMessage(baseUrl, slug, messages);
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `Chat failed: ${res.status}`);
        }

        const response = await parseStreamToChatMessage(res, startTime);
        dispatch({ type: 'agent_response_ready', prompt, response });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        dispatch({
          type: 'agent_response_ready',
          prompt,
          response: {
            role: 'assistant',
            content: `Error: ${msg}`,
            toolCalls: [],
            model: '',
            duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's',
            timestamp: Date.now(),
          },
        });
      }
    })();
  }, [
    dispatch,
    state,
    state.pendingUserMessage,
    state.currentConversationId,
    state.conversations,
  ]);

  // Render dialogs on top
  if (state.activeDialog === 'command') {
    return <CommandPaletteView state={state} />;
  }
  if (state.activeDialog === 'help') {
    return <HelpDialog width={state.width} height={state.height} />;
  }
  if (state.activeDialog === 'conversations') {
    return (
      <ConversationsDialog
        conversations={state.conversations}
        selectedId={state.currentConversationId}
        width={state.width}
        height={state.height}
      />
    );
  }
  if (state.activeDialog === 'theme') {
    return <ThemeDialog state={state} />;
  }
  if (state.activeDialog === 'stash') {
    return <StashDialog state={state} />;
  }
  if (state.activeDialog === 'agent') {
    return <AgentDialog state={state} />;
  }
  if (state.activeDialog === 'model') {
    return <ModelDialog state={state} />;
  }
  if (state.activeDialog === 'export') {
    return <ExportDialog state={state} />;
  }

  // Render main screens
  if (state.currentScreen === 'chat') {
    return <ChatView state={state} />;
  }
  return <MainView state={state} />;
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState());
  return (
    <ThemeProvider themeId={state.themeId}>
      <AppContent state={state} dispatch={dispatch} />
    </ThemeProvider>
  );
}

async function main() {
  const renderer = await createCliRenderer();
  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
