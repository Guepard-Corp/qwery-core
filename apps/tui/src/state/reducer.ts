import type {
  AppState,
  ChatMessage,
  CommandItem,
  Conversation,
  DialogType,
  Workspace,
} from './types.ts';
import { getCurrentConversation } from './types.ts';
import { themeIds } from '../theme/themes.ts';

export type Action =
  | { type: 'key'; key: string }
  | { type: 'loader_tick' }
  | { type: 'agent_response_ready'; prompt: string; response: ChatMessage }
  | {
      type: 'agent_stream_chunk';
      content: string;
      toolCalls: AppState['streamingToolCalls'];
    }
  | { type: 'set_conversation_slug'; conversationId: string; slug: string }
  | {
      type: 'set_conversation_server';
      conversationId: string;
      serverConv: { id: string; slug: string; datasources?: string[] };
    }
  | { type: 'set_workspace'; workspace: Workspace }
  | {
      type: 'set_project_datasources';
      datasources: AppState['projectDatasources'];
    }
  | { type: 'attach_datasource'; conversationId: string; datasourceId: string }
  | { type: 'detach_datasource'; conversationId: string; datasourceId: string }
  | { type: 'clear_pending_datasource_sync' }
  | { type: 'set_pending_datasource_sync'; conversationId: string }
  | { type: 'set_add_datasource_type_ids'; ids: string[]; names: string[] }
  | {
      type: 'submit_add_datasource';
      typeId: string;
      name: string;
      connection: string;
    }
  | {
      type: 'add_datasource_created';
      datasources: AppState['projectDatasources'];
    }
  | { type: 'add_datasource_failed' }
  | { type: 'mesh_status'; servers: number; workers: number; jobs: number }
  | { type: 'resize'; width: number; height: number }
  | { type: 'open_dialog'; dialog: DialogType }
  | { type: 'close_dialog' }
  | { type: 'new_conversation' }
  | { type: 'switch_conversation'; conversationId: string }
  | { type: 'execute_command'; action: string }
  | { type: 'set_theme'; themeId: string }
  | { type: 'history_back' }
  | { type: 'history_forward' }
  | { type: 'stash_push'; input: string }
  | { type: 'stash_restore'; index: number }
  | { type: 'set_agent'; agentId: string }
  | { type: 'set_model'; modelId: string }
  | {
      type: 'export_confirm';
      filename: string;
      thinking: boolean;
      toolDetails: boolean;
    }
  | { type: 'insert_text'; text: string }
  | { type: 'set_add_datasource_validation_error'; error: string | null }
  | { type: 'set_add_datasource_test_request' }
  | {
      type: 'set_add_datasource_test_result';
      status: 'idle' | 'pending' | 'ok' | 'error';
      message: string;
    };

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function getFilteredCommandItems(state: AppState): CommandItem[] {
  const search = state.commandPaletteSearch.toLowerCase();
  if (!search) return state.commandPaletteItems;
  return state.commandPaletteItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search),
  );
}

function updateCurrentConversation(
  state: AppState,
  updater: (conv: Conversation) => Conversation,
): AppState {
  if (!state.currentConversationId) return state;
  return {
    ...state,
    conversations: state.conversations.map((c) =>
      c.id === state.currentConversationId ? updater(c) : c,
    ),
  };
}

function getCurrentConversationToolKeys(state: AppState): string[] {
  const conv = getCurrentConversation(state);
  if (!conv) return [];
  const keys: string[] = [];
  conv.messages.forEach((msg, msgIdx) => {
    if (msg.role === 'assistant' && msg.toolCalls.length > 0) {
      msg.toolCalls.forEach((_, toolIdx) => {
        keys.push(`${msgIdx}_${toolIdx}`);
      });
    }
  });
  return keys;
}

function createConversation(
  title: string,
  firstMessage: ChatMessage,
): Conversation {
  const now = Date.now();
  return {
    id: generateId(),
    title,
    messages: [firstMessage],
    createdAt: now,
    updatedAt: now,
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'resize':
      return { ...state, width: action.width, height: action.height };

    case 'loader_tick':
      if (!state.agentBusy) return state;
      return { ...state, loaderPhase: state.loaderPhase + 1 };

    case 'agent_stream_chunk':
      return {
        ...state,
        streamingAgentContent: action.content,
        streamingToolCalls: action.toolCalls,
      };

    case 'agent_response_ready': {
      if (!state.agentBusy || !state.pendingUserMessage) return state;
      const newState = updateCurrentConversation(state, (conv) => ({
        ...conv,
        messages: [...conv.messages, action.response],
        updatedAt: Date.now(),
      }));
      return {
        ...newState,
        pendingUserMessage: '',
        agentBusy: false,
        streamingAgentContent: '',
        streamingToolCalls: [],
      };
    }

    case 'set_conversation_slug': {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, slug: action.slug } : c,
        ),
      };
    }

    case 'set_conversation_server': {
      return {
        ...state,
        currentConversationId:
          state.currentConversationId === action.conversationId
            ? action.serverConv.id
            : state.currentConversationId,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                id: action.serverConv.id,
                slug: action.serverConv.slug,
                datasources: action.serverConv.datasources ?? c.datasources,
              }
            : c,
        ),
      };
    }

    case 'set_workspace':
      return { ...state, workspace: action.workspace };

    case 'set_project_datasources':
      return { ...state, projectDatasources: action.datasources };

    case 'attach_datasource': {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                datasources: [
                  ...(c.datasources ?? []),
                  ...(c.datasources?.includes(action.datasourceId)
                    ? []
                    : [action.datasourceId]),
                ],
              }
            : c,
        ),
      };
    }

    case 'detach_datasource': {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                datasources: (c.datasources ?? []).filter(
                  (id) => id !== action.datasourceId,
                ),
              }
            : c,
        ),
      };
    }

    case 'set_pending_datasource_sync':
      return {
        ...state,
        pendingConversationDatasourceSync: action.conversationId,
      };

    case 'clear_pending_datasource_sync':
      return { ...state, pendingConversationDatasourceSync: null };

    case 'set_add_datasource_type_ids':
      return {
        ...state,
        addDatasourceTypeIds: action.ids,
        addDatasourceTypeNames: action.names,
      };

    case 'submit_add_datasource':
      return {
        ...state,
        pendingAddDatasource: {
          typeId: action.typeId,
          name: action.name,
          connection: action.connection,
        },
      };

    case 'add_datasource_created':
      return {
        ...state,
        activeDialog: 'none',
        pendingAddDatasource: null,
        projectDatasources: action.datasources,
        addDatasourceStep: 'type',
        addDatasourceTypeId: null,
        addDatasourceName: '',
        addDatasourceConnection: '',
      };

    case 'add_datasource_failed':
      return { ...state, pendingAddDatasource: null };

    case 'mesh_status':
      return {
        ...state,
        meshStatus: {
          servers: action.servers,
          workers: action.workers,
          jobs: action.jobs,
        },
      };

    case 'open_dialog':
      return { ...state, activeDialog: action.dialog };

    case 'close_dialog':
      return { ...state, activeDialog: 'none', commandPaletteSearch: '' };

    case 'new_conversation':
      return {
        ...state,
        currentScreen: 'home',
        currentConversationId: null,
        chatInput: '',
        input: '',
        activeDialog: 'none',
        focusedToolFlatIndex: null,
      };

    case 'switch_conversation': {
      const conv = state.conversations.find(
        (c) => c.id === action.conversationId,
      );
      if (!conv) return state;
      return {
        ...state,
        currentScreen: 'chat',
        currentConversationId: action.conversationId,
        activeDialog: 'none',
        focusedToolFlatIndex: null,
      };
    }

    case 'execute_command': {
      switch (action.action) {
        case 'new_conversation':
          return reducer(state, { type: 'new_conversation' });
        case 'show_conversations':
          return { ...state, activeDialog: 'conversations' };
        case 'show_datasources':
          return {
            ...state,
            activeDialog: 'datasources',
            datasourcesDialogSelected: 0,
          };
        case 'show_add_datasource':
          return {
            ...state,
            activeDialog: 'add_datasource',
            addDatasourceStep: 'type',
            addDatasourceTypeIds: [],
            addDatasourceTypeNames: [],
            addDatasourceTypeSelected: 0,
            addDatasourceTypeId: null,
            addDatasourceName: '',
            addDatasourceConnection: '',
            addDatasourceFormSelected: 0,
          };
        case 'show_help':
          return { ...state, activeDialog: 'help' };
        case 'show_theme': {
          const idx = themeIds.indexOf(state.themeId);
          return {
            ...state,
            activeDialog: 'theme',
            themeDialogSelected: idx >= 0 ? idx : 0,
          };
        }
        case 'show_export':
          return { ...state, activeDialog: 'export' };
        case 'show_stash':
          return {
            ...state,
            activeDialog: 'stash',
            stashSelected: 0,
          };
        case 'show_agent':
          return {
            ...state,
            activeDialog: 'agent',
            agentDialogSelected: 0,
          };
        case 'show_model':
          return {
            ...state,
            activeDialog: 'model',
            modelDialogSelected: 0,
          };
        case 'stash_current': {
          const input =
            state.currentScreen === 'chat' ? state.chatInput : state.input;
          const trimmed = input.trim();
          if (trimmed === '') return { ...state, activeDialog: 'none' };
          return reducer(
            { ...state, activeDialog: 'none' },
            { type: 'stash_push', input: trimmed },
          );
        }
        default:
          return { ...state, activeDialog: 'none' };
      }
    }

    case 'set_theme':
      return { ...state, themeId: action.themeId };

    case 'history_back':
    case 'history_forward': {
      const maxIdx = state.promptHistory.length - 1;
      if (maxIdx < 0) return state;
      const isChat = state.currentScreen === 'chat';
      if (action.type === 'history_back') {
        const next =
          state.promptHistoryIndex < 0
            ? 0
            : Math.min(maxIdx, state.promptHistoryIndex + 1);
        const entry = state.promptHistory[next];
        return {
          ...state,
          promptHistoryIndex: next,
          ...(isChat ? { chatInput: entry ?? '' } : { input: entry ?? '' }),
        };
      }
      const next =
        state.promptHistoryIndex <= 0 ? -1 : state.promptHistoryIndex - 1;
      const entry = next >= 0 ? (state.promptHistory[next] ?? '') : '';
      return {
        ...state,
        promptHistoryIndex: next,
        ...(isChat ? { chatInput: entry } : { input: entry }),
      };
    }

    case 'stash_push': {
      const entries = [
        ...state.stashEntries,
        { input: action.input, timestamp: Date.now() },
      ].slice(-50);
      return { ...state, stashEntries: entries };
    }

    case 'stash_restore': {
      const entry = state.stashEntries[action.index];
      if (!entry) return state;
      const isChat = state.currentScreen === 'chat';
      return {
        ...state,
        activeDialog: 'none',
        ...(isChat ? { chatInput: entry.input } : { input: entry.input }),
      };
    }

    case 'set_agent':
      return {
        ...state,
        selectedAgentId: action.agentId,
        activeDialog: 'none',
      };

    case 'set_model':
      return {
        ...state,
        selectedModelId: action.modelId,
        activeDialog: 'none',
      };

    case 'export_confirm':
      return {
        ...state,
        activeDialog: 'none',
        exportFilename: action.filename,
        exportThinking: action.thinking,
        exportToolDetails: action.toolDetails,
      };
  }

  if (action.type === 'set_add_datasource_validation_error') {
    return { ...state, addDatasourceValidationError: action.error };
  }
  if (action.type === 'set_add_datasource_test_request') {
    return { ...state, addDatasourceTestRequest: true };
  }
  if (action.type === 'set_add_datasource_test_result') {
    return {
      ...state,
      addDatasourceTestStatus: action.status,
      addDatasourceTestMessage: action.message,
      addDatasourceTestRequest: false,
    };
  }
  if (action.type === 'insert_text') {
    const text = action.text;
    if (!text) return state;
    if (
      state.activeDialog === 'add_datasource' &&
      state.addDatasourceStep === 'form'
    ) {
      const sel = state.addDatasourceFormSelected;
      if (sel >= 2) return state;
      return {
        ...state,
        ...(sel === 0
          ? { addDatasourceName: state.addDatasourceName + text }
          : { addDatasourceConnection: state.addDatasourceConnection + text }),
      };
    }
    if (state.activeDialog === 'command') {
      return {
        ...state,
        commandPaletteSearch: state.commandPaletteSearch + text,
      };
    }
    if (state.currentScreen === 'chat') {
      return { ...state, chatInput: state.chatInput + text };
    }
    if (state.activeDialog === 'none') {
      return { ...state, input: state.input + text };
    }
    return state;
  }

  // key action
  const key = action.key;

  // Handle dialogs first
  if (state.activeDialog !== 'none') {
    return handleDialogKey(state, key);
  }

  if (state.currentScreen === 'chat') {
    return handleChatKey(state, key);
  }

  // home screen
  return handleHomeKey(state, key);
}

function handleDialogKey(state: AppState, key: string): AppState {
  if (key === 'escape' || key === 'ctrl+c') {
    return { ...state, activeDialog: 'none', commandPaletteSearch: '' };
  }

  if (state.activeDialog === 'command') {
    const filtered = getFilteredCommandItems(state);
    if (key === 'up') {
      return {
        ...state,
        commandPaletteSelected: Math.max(0, state.commandPaletteSelected - 1),
      };
    }
    if (key === 'down') {
      const maxIdx = filtered.length > 0 ? filtered.length - 1 : 0;
      return {
        ...state,
        commandPaletteSelected: Math.min(
          maxIdx,
          state.commandPaletteSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      const selected = filtered[state.commandPaletteSelected];
      if (selected?.action) {
        return reducer(
          { ...state, activeDialog: 'none', commandPaletteSearch: '' },
          { type: 'execute_command', action: selected.action },
        );
      }
      return { ...state, activeDialog: 'none', commandPaletteSearch: '' };
    }
    if (key === 'backspace') {
      return {
        ...state,
        commandPaletteSearch: state.commandPaletteSearch.slice(0, -1),
        commandPaletteSelected: 0,
      };
    }
    if (key.length === 1) {
      return {
        ...state,
        commandPaletteSearch: state.commandPaletteSearch + key,
        commandPaletteSelected: 0,
      };
    }
  }

  if (state.activeDialog === 'conversations') {
    if (key === 'up') {
      const currentIdx = state.conversations.findIndex(
        (c) => c.id === state.currentConversationId,
      );
      const newIdx = Math.max(0, currentIdx - 1);
      const conv = state.conversations[newIdx];
      if (conv) {
        return { ...state, currentConversationId: conv.id };
      }
    }
    if (key === 'down') {
      const currentIdx = state.conversations.findIndex(
        (c) => c.id === state.currentConversationId,
      );
      const newIdx = Math.min(state.conversations.length - 1, currentIdx + 1);
      const conv = state.conversations[newIdx];
      if (conv) {
        return { ...state, currentConversationId: conv.id };
      }
    }
    if (key === 'enter') {
      if (state.currentConversationId) {
        return {
          ...state,
          currentScreen: 'chat',
          activeDialog: 'none',
        };
      }
    }
  }

  if (state.activeDialog === 'theme') {
    if (key === 'up') {
      return {
        ...state,
        themeDialogSelected: Math.max(0, state.themeDialogSelected - 1),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        themeDialogSelected: Math.min(
          themeIds.length - 1,
          state.themeDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      const id = themeIds[state.themeDialogSelected];
      if (id) {
        return {
          ...state,
          themeId: id,
          activeDialog: 'none',
        };
      }
    }
  }

  if (state.activeDialog === 'stash') {
    if (key === 'up') {
      return {
        ...state,
        stashSelected: Math.max(0, state.stashSelected - 1),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        stashSelected: Math.min(
          state.stashEntries.length - 1,
          state.stashSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      const entry = state.stashEntries[state.stashSelected];
      if (entry) {
        return reducer(state, {
          type: 'stash_restore',
          index: state.stashSelected,
        });
      }
    }
  }

  if (state.activeDialog === 'agent') {
    const agentIds = ['query', 'ask'];
    if (key === 'up') {
      return {
        ...state,
        agentDialogSelected: Math.max(0, state.agentDialogSelected - 1),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        agentDialogSelected: Math.min(
          agentIds.length - 1,
          state.agentDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      const id = agentIds[state.agentDialogSelected];
      if (id) {
        return reducer(state, { type: 'set_agent', agentId: id });
      }
    }
  }

  if (state.activeDialog === 'model') {
    const modelIds = ['qwery-engine', 'mock'];
    if (key === 'up') {
      return {
        ...state,
        modelDialogSelected: Math.max(0, state.modelDialogSelected - 1),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        modelDialogSelected: Math.min(
          modelIds.length - 1,
          state.modelDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      const id = modelIds[state.modelDialogSelected];
      if (id) {
        return reducer(state, { type: 'set_model', modelId: id });
      }
    }
  }

  if (state.activeDialog === 'datasources') {
    const conv =
      state.conversations.find((c) => c.id === state.currentConversationId) ??
      null;
    const attachedIds = conv?.datasources ?? [];
    const available = state.projectDatasources.filter(
      (d) => !attachedIds.includes(d.id),
    );
    const attachedItems = attachedIds.map((id) => ({
      id,
      name: state.projectDatasources.find((d) => d.id === id)?.name ?? id,
      attached: true,
    }));
    const availableItems = available.map((d) => ({
      id: d.id,
      name: d.name,
      attached: false,
    }));
    const items = [...attachedItems, ...availableItems];

    if (key === 'up') {
      return {
        ...state,
        datasourcesDialogSelected: Math.max(
          0,
          state.datasourcesDialogSelected - 1,
        ),
      };
    }
    if (key === 'down') {
      const maxIdx = items.length > 0 ? items.length - 1 : 0;
      return {
        ...state,
        datasourcesDialogSelected: Math.min(
          maxIdx,
          state.datasourcesDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter' && conv) {
      const item = items[state.datasourcesDialogSelected];
      if (!item) return state;
      const newState = item.attached
        ? reducer(state, {
            type: 'detach_datasource',
            conversationId: conv.id,
            datasourceId: item.id,
          })
        : reducer(state, {
            type: 'attach_datasource',
            conversationId: conv.id,
            datasourceId: item.id,
          });
      return {
        ...newState,
        pendingConversationDatasourceSync: conv.id,
      };
    }
  }

  if (state.activeDialog === 'add_datasource') {
    if (state.addDatasourceStep === 'type') {
      const ids = state.addDatasourceTypeIds;
      if (key === 'up') {
        return {
          ...state,
          addDatasourceTypeSelected: Math.max(
            0,
            state.addDatasourceTypeSelected - 1,
          ),
        };
      }
      if (key === 'down') {
        const maxIdx = ids.length > 0 ? ids.length - 1 : 0;
        return {
          ...state,
          addDatasourceTypeSelected: Math.min(
            maxIdx,
            state.addDatasourceTypeSelected + 1,
          ),
        };
      }
      if (key === 'enter' && ids[state.addDatasourceTypeSelected]) {
        const typeId = ids[state.addDatasourceTypeSelected]!;
        const typeName =
          state.addDatasourceTypeNames[state.addDatasourceTypeSelected] ??
          typeId;
        return {
          ...state,
          addDatasourceStep: 'form',
          addDatasourceTypeId: typeId,
          addDatasourceName: typeName,
          addDatasourceFormSelected: 0,
          addDatasourceValidationError: null,
          addDatasourceTestStatus: 'idle',
          addDatasourceTestMessage: '',
        };
      }
    } else {
      if (key === 'escape') {
        return {
          ...state,
          addDatasourceStep: 'type',
          addDatasourceTypeId: null,
          addDatasourceName: '',
          addDatasourceConnection: '',
          addDatasourceFormSelected: 0,
          addDatasourceValidationError: null,
          addDatasourceTestStatus: 'idle',
          addDatasourceTestMessage: '',
        };
      }
      const sel = state.addDatasourceFormSelected;
      const maxFormSel = 4;

      if (key === 'up') {
        return {
          ...state,
          addDatasourceFormSelected: sel <= 0 ? maxFormSel : sel - 1,
        };
      }
      if (key === 'down') {
        return {
          ...state,
          addDatasourceFormSelected: sel >= maxFormSel ? 0 : sel + 1,
        };
      }
      if (key === 'left' && sel >= 2) {
        return {
          ...state,
          addDatasourceFormSelected: sel <= 2 ? 4 : sel - 1,
        };
      }
      if (key === 'right' && sel >= 2) {
        return {
          ...state,
          addDatasourceFormSelected: sel >= 4 ? 2 : sel + 1,
        };
      }
      if (key === 'enter') {
        if (sel === 2) {
          return { ...state, addDatasourceTestRequest: true };
        }
        if (sel === 3) {
          const typeId = state.addDatasourceTypeId;
          if (!typeId) {
            return {
              ...state,
              addDatasourceValidationError: 'No datasource type selected.',
            };
          }
          if (!state.workspace?.projectId) {
            return {
              ...state,
              addDatasourceValidationError:
                'No project. Restart TUI to initialize workspace.',
            };
          }
          return reducer(state, {
            type: 'submit_add_datasource',
            typeId,
            name: state.addDatasourceName.trim() || typeId,
            connection: state.addDatasourceConnection,
          });
        }
        if (sel === 4) {
          return {
            ...state,
            activeDialog: 'none',
            addDatasourceStep: 'type',
            addDatasourceTypeId: null,
            addDatasourceName: '',
            addDatasourceConnection: '',
            addDatasourceFormSelected: 0,
            addDatasourceValidationError: null,
            addDatasourceTestStatus: 'idle',
            addDatasourceTestMessage: '',
          };
        }
        return state;
      }
      if (sel >= 2) return state;
      if (key === 'backspace') {
        return {
          ...state,
          ...(sel === 0
            ? { addDatasourceName: state.addDatasourceName.slice(0, -1) }
            : {
                addDatasourceConnection: state.addDatasourceConnection.slice(
                  0,
                  -1,
                ),
              }),
        };
      }
      if (key.length === 1) {
        return {
          ...state,
          ...(sel === 0
            ? { addDatasourceName: state.addDatasourceName + key }
            : { addDatasourceConnection: state.addDatasourceConnection + key }),
        };
      }
    }
  }

  return state;
}

function handleChatKey(state: AppState, key: string): AppState {
  if (key === 'ctrl+c') return state; // quit handled by app

  const toolKeys = getCurrentConversationToolKeys(state);
  const toolCount = toolKeys.length;

  if (state.focusedToolFlatIndex !== null) {
    if (key === 'escape') {
      return { ...state, focusedToolFlatIndex: null };
    }
    if (key === 'up') {
      return {
        ...state,
        focusedToolFlatIndex: Math.max(0, state.focusedToolFlatIndex - 1),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        focusedToolFlatIndex:
          toolCount > 0
            ? Math.min(toolCount - 1, state.focusedToolFlatIndex + 1)
            : 0,
      };
    }
    if (key === 'enter') {
      const keyAt = toolKeys[state.focusedToolFlatIndex];
      if (keyAt) {
        const next = {
          ...state.expandedToolKeys,
          [keyAt]: !state.expandedToolKeys[keyAt],
        };
        return { ...state, expandedToolKeys: next };
      }
    }
    return state;
  }

  if (key === 'escape') {
    if (state.agentBusy) {
      return { ...state, agentBusy: false, pendingUserMessage: '' };
    }
    return { ...state, currentScreen: 'home' };
  }
  if (key === 'tab' && state.chatInput === '' && toolCount > 0) {
    return { ...state, focusedToolFlatIndex: 0 };
  }
  if (key === 'ctrl+up' && toolCount > 0) {
    return { ...state, focusedToolFlatIndex: 0 };
  }
  if (key === 'ctrl+down') {
    return { ...state, focusedToolFlatIndex: null };
  }
  if (key === 'ctrl+p') {
    return {
      ...state,
      activeDialog: 'command',
      commandPaletteSearch: '',
      commandPaletteSelected: 0,
    };
  }
  if (key === 'ctrl+l') {
    return { ...state, activeDialog: 'conversations' };
  }
  if (key === 'ctrl+n') {
    return reducer(state, { type: 'new_conversation' });
  }
  if (key === 'ctrl+?') {
    return { ...state, activeDialog: 'help' };
  }
  if (key === 'ctrl+s') {
    return reducer(state, { type: 'execute_command', action: 'stash_current' });
  }
  if (key === 'backspace') {
    return { ...state, chatInput: state.chatInput.slice(0, -1) };
  }
  if (key === 'enter') {
    const trimmed = state.chatInput.trim();
    if (trimmed !== '') {
      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        toolCalls: [],
        model: '',
        duration: '',
        timestamp: Date.now(),
      };

      let newState = state;
      if (!state.currentConversationId) {
        // Create new conversation
        const title =
          trimmed.length > 30 ? trimmed.slice(0, 27) + '...' : trimmed;
        const conv = createConversation(title, userMsg);
        newState = {
          ...state,
          conversations: [conv, ...state.conversations],
          currentConversationId: conv.id,
        };
      } else {
        // Add to existing conversation
        newState = updateCurrentConversation(state, (conv) => ({
          ...conv,
          messages: [...conv.messages, userMsg],
          updatedAt: Date.now(),
        }));
      }

      const history = [trimmed, ...state.promptHistory].slice(0, 50);
      return {
        ...newState,
        chatInput: '',
        agentBusy: true,
        loaderPhase: 0,
        pendingUserMessage: trimmed,
        promptHistory: history,
        promptHistoryIndex: 0,
      };
    }
    return state;
  }
  if (
    key === 'up' &&
    state.chatInput === '' &&
    state.promptHistory.length > 0
  ) {
    return reducer(state, { type: 'history_back' });
  }
  if (
    key === 'down' &&
    state.chatInput === '' &&
    state.promptHistory.length > 0
  ) {
    return reducer(state, { type: 'history_forward' });
  }
  if (key.length === 1) {
    return {
      ...state,
      chatInput: state.chatInput + key,
      promptHistoryIndex: -1,
    };
  }
  return state;
}

function handleHomeKey(state: AppState, key: string): AppState {
  if (key === 'ctrl+c' || key === 'q') return state;
  if (key === 'ctrl+p') {
    return {
      ...state,
      activeDialog: 'command',
      commandPaletteSearch: '',
      commandPaletteSelected: 0,
    };
  }
  if (key === 'ctrl+l') {
    return { ...state, activeDialog: 'conversations' };
  }
  if (key === 'ctrl+?') {
    return { ...state, activeDialog: 'help' };
  }
  if (key === 'ctrl+s') {
    return reducer(state, { type: 'execute_command', action: 'stash_current' });
  }
  if (key === 'tab') {
    const len = state.menuItems.length;
    if (len > 0) {
      return { ...state, selectedIdx: (state.selectedIdx + 1) % len };
    }
    return state;
  }
  if (key === 'shift+tab') {
    const len = state.menuItems.length;
    if (len > 0) {
      const next = state.selectedIdx - 1;
      return { ...state, selectedIdx: next < 0 ? len - 1 : next };
    }
    return state;
  }
  if (key === 'left') {
    return { ...state, selectedIdx: Math.max(0, state.selectedIdx - 1) };
  }
  if (key === 'right') {
    return {
      ...state,
      selectedIdx: Math.min(state.menuItems.length - 1, state.selectedIdx + 1),
    };
  }
  if (key === 'backspace') {
    return { ...state, input: state.input.slice(0, -1) };
  }
  if (key === 'enter') {
    const trimmed = state.input.trim();
    if (trimmed !== '') {
      const title =
        trimmed.length > 30 ? trimmed.slice(0, 27) + '...' : trimmed;
      const userMsg: ChatMessage = {
        role: 'user',
        content: state.input,
        toolCalls: [],
        model: '',
        duration: '',
        timestamp: Date.now(),
      };
      const conv = createConversation(title, userMsg);
      const history = [state.input, ...state.promptHistory].slice(0, 50);
      return {
        ...state,
        currentScreen: 'chat',
        conversations: [conv, ...state.conversations],
        currentConversationId: conv.id,
        chatInput: '',
        input: '',
        agentBusy: true,
        loaderPhase: 0,
        pendingUserMessage: state.input,
        promptHistory: history,
        promptHistoryIndex: 0,
      };
    }
    return state;
  }
  if (key === 'up' && state.input === '' && state.promptHistory.length > 0) {
    return reducer(state, { type: 'history_back' });
  }
  if (key === 'down' && state.input === '' && state.promptHistory.length > 0) {
    return reducer(state, { type: 'history_forward' });
  }
  if (key.length === 1) {
    return {
      ...state,
      input: state.input + key,
      promptHistoryIndex: -1,
    };
  }
  return state;
}

export function keyEventToKeyString(e: {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}): string {
  const parts: string[] = [];
  if (e.ctrl) parts.push('ctrl');
  if (e.shift) parts.push('shift');
  if (e.meta) parts.push('meta');
  const name = e.name.toLowerCase();
  if (name === 'escape' || name === 'esc') return 'escape';
  if (name === 'space') return ' ';
  if (name === 'return' || name === 'enter')
    return parts.length ? parts.join('+') + '+enter' : 'enter';
  if (name === 'backspace')
    return parts.length ? parts.join('+') + '+backspace' : 'backspace';
  if (name === 'tab') return parts.length ? parts.join('+') + '+tab' : 'tab';
  if (['up', 'down', 'left', 'right'].includes(name))
    return parts.length ? parts.join('+') + '+' + name : name;
  if (parts.length) return parts.join('+') + '+' + name;
  return name;
}
