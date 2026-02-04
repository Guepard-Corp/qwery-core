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
import { DatasourcesDialog } from './components/DatasourcesDialog.tsx';
import { AddDatasourceDialog } from './components/AddDatasourceDialog.tsx';
import {
  ExportDialog,
  writeConversationToFile,
} from './components/ExportDialog.tsx';
import {
  ensureServerRunning,
  apiBase,
  initWorkspace,
  createConversation,
  updateConversation,
  sendChatMessage,
  parseStreamToChatMessageStreaming,
  getDatasources,
  createDatasource,
  testConnection,
  validateProviderConfig,
  normalizeProviderConfig,
  connectionToRawConfig,
} from './server-client.ts';
import { getDatasourceTypes } from '@qwery/datasource-registry';
import { getCurrentConversation } from './state/types.ts';

async function readClipboard(): Promise<string> {
  const platform = typeof process !== 'undefined' ? process.platform : 'linux';
  try {
    if (platform === 'darwin') {
      const proc = Bun.spawn(['pbpaste'], { stdout: 'pipe' });
      const text = await new Response(proc.stdout).text();
      await proc.exited;
      return text;
    }
    if (platform === 'win32') {
      const proc = Bun.spawn(['powershell', '-Command', 'Get-Clipboard'], {
        stdout: 'pipe',
      });
      const text = await new Response(proc.stdout).text();
      await proc.exited;
      return text;
    }
    const proc = Bun.spawn(
      [
        'sh',
        '-c',
        'xclip -o -selection clipboard 2>/dev/null || xsel -b 2>/dev/null',
      ],
      {
        stdout: 'pipe',
      },
    );
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    return text;
  } catch {
    return '';
  }
}

interface AppContentProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

function AppContent({ state, dispatch }: AppContentProps) {
  const { width, height } = useTerminalDimensions();
  const _pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMessageInFlightRef = useRef<string | null>(null);

  useEffect(() => {
    dispatch({ type: 'resize', width, height });
  }, [dispatch, width, height]);

  useEffect(() => {
    let cancelled = false;
    ensureServerRunning()
      .then((root) => initWorkspace(apiBase(root)))
      .then((workspace) => {
        if (!cancelled) dispatch({ type: 'set_workspace', workspace });
        return workspace;
      })
      .then((workspace) => {
        if (cancelled || !workspace?.projectId) return;
        return ensureServerRunning().then((root) =>
          getDatasources(apiBase(root), workspace.projectId!).then((list) => {
            if (!cancelled)
              dispatch({ type: 'set_project_datasources', datasources: list });
          }),
        );
      })
      .catch((err) => {
        if (!cancelled)
          console.error(
            '[TUI] Init failed',
            err instanceof Error ? err.message : err,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    const convId = state.pendingConversationDatasourceSync;
    if (!convId) return;
    const conv = state.conversations.find((c) => c.id === convId);
    if (!conv) {
      dispatch({ type: 'clear_pending_datasource_sync' });
      return;
    }
    let cancelled = false;
    ensureServerRunning()
      .then((root) =>
        updateConversation(apiBase(root), conv.id, {
          datasources: conv.datasources ?? [],
        }),
      )
      .then(() => {
        if (!cancelled) dispatch({ type: 'clear_pending_datasource_sync' });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'clear_pending_datasource_sync' });
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, state.pendingConversationDatasourceSync, state.conversations]);

  useEffect(() => {
    if (
      state.activeDialog === 'add_datasource' &&
      state.addDatasourceStep === 'type' &&
      state.addDatasourceTypeIds.length === 0
    ) {
      const types = getDatasourceTypes();
      dispatch({
        type: 'set_add_datasource_type_ids',
        ids: types.map((t) => t.id),
        names: types.map((t) => t.name),
      });
    }
  }, [
    dispatch,
    state.activeDialog,
    state.addDatasourceStep,
    state.addDatasourceTypeIds.length,
  ]);

  useEffect(() => {
    const pending = state.pendingAddDatasource;
    if (!pending) return;
    console.log('[TUI] Create datasource effect run', {
      typeId: pending.typeId,
      projectId: state.workspace?.projectId ?? null,
    });
    if (!state.workspace?.projectId) {
      console.log('[TUI] Create skipped: no projectId');
      dispatch({
        type: 'set_add_datasource_validation_error',
        error: 'No project. Restart TUI to initialize workspace.',
      });
      dispatch({ type: 'add_datasource_failed' });
      return;
    }
    const rawConfig = connectionToRawConfig(pending.connection);
    const validationError = validateProviderConfig(pending.typeId, rawConfig);
    if (validationError) {
      dispatch({
        type: 'set_add_datasource_validation_error',
        error: validationError,
      });
      dispatch({ type: 'add_datasource_failed' });
      return;
    }
    const config = normalizeProviderConfig(pending.typeId, rawConfig);
    let cancelled = false;
    console.log('[TUI] Create datasource calling API');
    ensureServerRunning()
      .then((root) => {
        const api = apiBase(root);
        const name = pending.name.trim() || pending.typeId;
        return createDatasource(api, {
          projectId: state.workspace!.projectId!,
          name,
          description: name,
          datasource_provider: pending.typeId,
          datasource_driver: pending.typeId,
          datasource_kind: 'embedded',
          config,
          createdBy: state.workspace?.userId ?? 'tui',
        });
      })
      .then(() => {
        if (cancelled) return;
        console.log('[TUI] Create datasource API success, fetching list');
        return ensureServerRunning().then((root) =>
          getDatasources(apiBase(root), state.workspace!.projectId!).then(
            (list) => {
              if (!cancelled) {
                console.log(
                  '[TUI] Create done, datasources count',
                  list?.length ?? 0,
                );
                dispatch({ type: 'add_datasource_created', datasources: list });
              }
            },
          ),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log('[TUI] Create datasource failed', msg);
          dispatch({
            type: 'set_add_datasource_validation_error',
            error: `Create failed: ${msg}`,
          });
          dispatch({ type: 'add_datasource_failed' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, state.pendingAddDatasource, state.workspace]);

  useEffect(() => {
    if (!state.addDatasourceTestRequest || !state.addDatasourceTypeId) return;
    const typeId = state.addDatasourceTypeId;
    console.log('[TUI] Test connection started', typeId);
    dispatch({
      type: 'set_add_datasource_test_result',
      status: 'pending',
      message: '',
    });
    const rawConfig = connectionToRawConfig(state.addDatasourceConnection);
    const validationError = validateProviderConfig(typeId, rawConfig);
    if (validationError) {
      dispatch({
        type: 'set_add_datasource_validation_error',
        error: validationError,
      });
      dispatch({
        type: 'set_add_datasource_test_result',
        status: 'idle',
        message: '',
      });
      return;
    }
    const config = normalizeProviderConfig(typeId, rawConfig);
    const payload = {
      datasource_provider: typeId,
      datasource_driver: typeId,
      datasource_kind: 'embedded',
      name: state.addDatasourceName.trim() || typeId,
      config,
    };
    let cancelled = false;
    ensureServerRunning()
      .then((root) => testConnection(apiBase(root), payload))
      .then((result) => {
        if (cancelled) return;
        console.log(
          '[TUI] Test connection result',
          result.success,
          result.error,
        );
        if (result.success && result.data?.connected) {
          dispatch({
            type: 'set_add_datasource_test_result',
            status: 'ok',
            message: result.data.message || 'Connection successful',
          });
        } else {
          dispatch({
            type: 'set_add_datasource_test_result',
            status: 'error',
            message: result.error || 'Connection failed',
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Connection failed';
          console.log('[TUI] Test connection error', msg);
          dispatch({
            type: 'set_add_datasource_test_result',
            status: 'error',
            message: msg,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    state.addDatasourceTestRequest,
    state.addDatasourceTypeId,
    state.addDatasourceName,
    state.addDatasourceConnection,
  ]);

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
    if (key === 'ctrl+v') {
      readClipboard().then((text) => {
        if (text) dispatch({ type: 'insert_text', text });
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
    const prompt = state.pendingUserMessage;
    if (!prompt) return;
    if (pendingMessageInFlightRef.current === prompt) return;
    pendingMessageInFlightRef.current = prompt;
    const startTime = Date.now();

    void (async () => {
      try {
        const root = await ensureServerRunning();
        const api = apiBase(root);
        const conv = getCurrentConversation(state);
        if (!conv) {
          pendingMessageInFlightRef.current = null;
          return;
        }

        let slug = conv.slug;
        if (!slug) {
          const created = await createConversation(api, conv.title, prompt, {
            projectId: state.workspace?.projectId ?? undefined,
            datasources: conv.datasources,
          });
          slug = created.slug;
          dispatch({
            type: 'set_conversation_server',
            conversationId: conv.id,
            serverConv: {
              id: created.id,
              slug: created.slug,
              datasources: created.datasources,
            },
          });
        }

        const messages = conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await sendChatMessage(
          api,
          slug ?? conv.slug!,
          messages,
          undefined,
          conv.datasources,
        );
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `Chat failed: ${res.status}`);
        }

        dispatch({ type: 'agent_stream_chunk', content: '', toolCalls: [] });

        const response = await parseStreamToChatMessageStreaming(
          res,
          startTime,
          (content, toolCalls) => {
            dispatch({ type: 'agent_stream_chunk', content, toolCalls });
          },
        );
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
      } finally {
        pendingMessageInFlightRef.current = null;
      }
    })();
  }, [
    dispatch,
    state.pendingUserMessage,
    state.currentConversationId,
    state.conversations,
    state.workspace,
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
  if (state.activeDialog === 'datasources') {
    return <DatasourcesDialog state={state} />;
  }
  if (state.activeDialog === 'add_datasource') {
    return <AddDatasourceDialog state={state} />;
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

async function setupDebugLogFile() {
  const logPath =
    typeof process !== 'undefined'
      ? process.env.QWERY_TUI_DEBUG_LOG
      : undefined;
  if (!logPath || typeof logPath !== 'string') return;
  const fs = await import('node:fs');
  const path = await import('node:path');
  const resolvedPath = path.isAbsolute(logPath)
    ? logPath
    : path.join(process.cwd(), logPath);
  try {
    fs.writeFileSync(resolvedPath, '');
  } catch {
    // ignore
  }
  const write = (level: string, ...args: unknown[]) => {
    const line =
      [new Date().toISOString(), level, ...args.map((a) => String(a))].join(
        ' ',
      ) + '\n';
    try {
      fs.appendFileSync(resolvedPath, line);
    } catch {
      // ignore
    }
  };
  console.log = (...args: unknown[]) => write('LOG', ...args);
  console.error = (...args: unknown[]) => write('ERROR', ...args);
  console.warn = (...args: unknown[]) => write('WARN', ...args);
  console.debug = (...args: unknown[]) => write('DEBUG', ...args);
}

async function main() {
  await setupDebugLogFile();
  if (process.env.QWERY_TUI_DEBUG_LOG) {
    const path = await import('node:path');
    const resolved = path.isAbsolute(process.env.QWERY_TUI_DEBUG_LOG)
      ? process.env.QWERY_TUI_DEBUG_LOG
      : path.join(process.cwd(), process.env.QWERY_TUI_DEBUG_LOG);
    console.log('[TUI] Debug log active', resolved);
  }
  const renderer = await createCliRenderer();
  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
