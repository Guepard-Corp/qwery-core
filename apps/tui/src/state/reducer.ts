import type {
  AppState,
  ChatMessage,
  CommandItem,
  Conversation,
  DialogType,
  TuiNotebook,
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
  | { type: 'set_conversations'; conversations: Conversation[] }
  | {
      type: 'set_conversation_messages';
      conversationId: string;
      messages: ChatMessage[];
    }
  | { type: 'add_conversation_and_switch'; conversation: Conversation }
  | { type: 'request_new_conversation' }
  | { type: 'clear_request_new_conversation' }
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
    }
  | { type: 'set_notebooks'; notebooks: TuiNotebook[] }
  | { type: 'set_current_notebook'; notebook: TuiNotebook | null }
  | { type: 'open_notebook'; notebook: TuiNotebook }
  | { type: 'close_notebook' }
  | {
      type: 'notebook_cell_result';
      cellId: number;
      result: { rows: unknown[]; headers: { name: string }[] } | null;
    }
  | { type: 'notebook_cell_loading'; cellId: number | null }
  | { type: 'run_notebook_cell'; cellId: number }
  | { type: 'notebook_focus_cell'; index: number }
  | { type: 'update_notebook_cell_query'; cellId: number; query: string }
  | { type: 'add_notebook_cell' }
  | {
      type: 'set_notebook_cell_datasource';
      cellId: number;
      datasourceIds: string[];
    }
  | { type: 'set_notebook_pending_save' }
  | { type: 'clear_notebook_pending_save' }
  | { type: 'open_new_notebook_name_dialog' }
  | { type: 'submit_new_notebook_name'; title: string }
  | { type: 'request_new_notebook' }
  | { type: 'update_notebook_cell_title'; cellId: number; title: string }
  | { type: 'start_editing_cell_title'; cellId: number }
  | { type: 'stop_editing_cell_title' }
  | { type: 'clear_request_new_notebook' }
  | { type: 'notebook_cell_error'; cellId: number; error: string | null }
  | { type: 'set_notebook_create_error'; error: string | null };

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

    case 'set_conversations':
      return { ...state, conversations: action.conversations };

    case 'set_conversation_messages': {
      const conversations = state.conversations.map((c) =>
        c.id === action.conversationId
          ? { ...c, messages: action.messages, updatedAt: Date.now() }
          : c,
      );
      return { ...state, conversations };
    }

    case 'add_conversation_and_switch':
      return {
        ...state,
        conversations: [action.conversation, ...state.conversations],
        currentConversationId: action.conversation.id,
        currentScreen: 'chat',
        chatInput: '',
        input: '',
        activeDialog: 'none',
        focusedToolFlatIndex: null,
      };

    case 'request_new_conversation':
      return { ...state, requestNewConversation: true, activeDialog: 'none' };

    case 'clear_request_new_conversation':
      return { ...state, requestNewConversation: false };

    case 'set_notebooks':
      return { ...state, projectNotebooks: action.notebooks };

    case 'set_current_notebook':
      return { ...state, currentNotebook: action.notebook };

    case 'open_notebook': {
      const openCells = action.notebook.cells;
      const firstQuery = openCells[0]?.query ?? '';
      return {
        ...state,
        currentNotebook: action.notebook,
        currentScreen: 'notebook',
        activeDialog: 'none',
        notebookFocusedCellIndex: 0,
        notebookCellInput: firstQuery,
      };
    }

    case 'close_notebook':
      return {
        ...state,
        currentNotebook: null,
        currentScreen:
          state.currentScreen === 'notebook' ? 'home' : state.currentScreen,
        notebookCellResults: {},
        notebookCellErrors: {},
        notebookCellLoading: null,
        notebookCellInput: '',
        notebookCellDatasourcePickerOpen: false,
        notebookCellDatasourcePickerSelected: 0,
      };

    case 'notebook_cell_result': {
      const next = { ...state.notebookCellResults };
      if (action.result) {
        next[String(action.cellId)] = action.result;
      } else {
        delete next[String(action.cellId)];
      }
      return {
        ...state,
        notebookCellResults: next,
        notebookCellLoading: null,
      };
    }

    case 'notebook_cell_loading':
      return { ...state, notebookCellLoading: action.cellId };

    case 'run_notebook_cell':
      return { ...state, notebookCellLoading: action.cellId };

    case 'notebook_focus_cell': {
      const nb = state.currentNotebook;
      const query = nb?.cells[action.index]?.query ?? '';
      return {
        ...state,
        notebookFocusedCellIndex: action.index,
        notebookCellInput: query,
      };
    }
    case 'update_notebook_cell_query': {
      const nb = state.currentNotebook;
      if (!nb) return state;
      const cells = nb.cells.map((c) =>
        c.cellId === action.cellId ? { ...c, query: action.query } : c,
      );
      return {
        ...state,
        currentNotebook: { ...nb, cells },
      };
    }
    case 'add_notebook_cell': {
      const nb = state.currentNotebook;
      if (!nb) return state;
      const maxId = Math.max(0, ...nb.cells.map((c) => c.cellId));
      const newCell = {
        cellId: maxId + 1,
        cellType: 'query' as const,
        query: '',
        datasources: [] as string[],
        isActive: true,
        runMode: 'default' as const,
      };
      const cells = [...nb.cells, newCell];
      const newIdx = cells.length - 1;
      return {
        ...state,
        currentNotebook: { ...nb, cells },
        notebookFocusedCellIndex: newIdx,
        notebookCellInput: '',
        notebookPendingSave: true,
      };
    }
    case 'set_notebook_cell_datasource': {
      const nb = state.currentNotebook;
      if (!nb) return state;
      const cells = nb.cells.map((c) =>
        c.cellId === action.cellId
          ? { ...c, datasources: [...action.datasourceIds] }
          : c,
      );
      return {
        ...state,
        currentNotebook: { ...nb, cells },
        notebookPendingSave: true,
      };
    }
    case 'set_notebook_pending_save':
      return { ...state, notebookPendingSave: true };
    case 'clear_notebook_pending_save':
      return { ...state, notebookPendingSave: false };

    case 'open_new_notebook_name_dialog':
      return {
        ...state,
        activeDialog: 'new_notebook_name',
        newNotebookNameInput: 'Untitled notebook',
      };
    case 'submit_new_notebook_name':
      return {
        ...state,
        activeDialog: 'none',
        requestNewNotebook: true,
        pendingNewNotebookTitle: action.title.trim() || 'Untitled notebook',
      };
    case 'request_new_notebook':
      return { ...state, requestNewNotebook: true, activeDialog: 'none' };

    case 'clear_request_new_notebook':
      return {
        ...state,
        requestNewNotebook: false,
        pendingNewNotebookTitle: null,
      };
    case 'update_notebook_cell_title': {
      const nb = state.currentNotebook;
      if (!nb) return state;
      const cells = nb.cells.map((c) =>
        c.cellId === action.cellId ? { ...c, title: action.title } : c,
      );
      return {
        ...state,
        currentNotebook: { ...nb, cells },
        notebookEditingCellTitle: null,
        notebookPendingSave: true,
      };
    }
    case 'start_editing_cell_title': {
      const nb = state.currentNotebook;
      const cell = nb?.cells.find((c) => c.cellId === action.cellId);
      return {
        ...state,
        notebookEditingCellTitle: action.cellId,
        notebookCellTitleInput: cell?.title ?? '',
      };
    }
    case 'stop_editing_cell_title':
      return {
        ...state,
        notebookEditingCellTitle: null,
      };

    case 'notebook_cell_error': {
      const next = { ...state.notebookCellErrors };
      if (action.error) next[String(action.cellId)] = action.error;
      else delete next[String(action.cellId)];
      return {
        ...state,
        notebookCellErrors: next,
        notebookCellLoading: null,
      };
    }

    case 'set_notebook_create_error':
      return { ...state, notebookCreateError: action.error };

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
          return reducer(state, { type: 'request_new_conversation' });
        case 'show_conversations':
          return {
            ...state,
            activeDialog: 'conversations',
            conversationsDialogSelected: 0,
          };
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
        case 'show_notebooks':
          return {
            ...state,
            activeDialog: 'notebooks',
            notebooksDialogSelected: 0,
            notebookCreateError: null,
          };
        case 'new_notebook':
          return reducer(state, { type: 'open_new_notebook_name_dialog' });
        case 'new_notebook_cell':
          if (state.currentScreen === 'notebook' && state.currentNotebook)
            return reducer(state, { type: 'add_notebook_cell' });
          return state;
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
    if (state.activeDialog === 'new_notebook_name') {
      return {
        ...state,
        newNotebookNameInput: state.newNotebookNameInput + text,
      };
    }
    if (state.currentScreen === 'chat') {
      return { ...state, chatInput: state.chatInput + text };
    }
    if (state.currentScreen === 'notebook') {
      if (state.notebookEditingCellTitle != null) {
        return {
          ...state,
          notebookCellTitleInput: state.notebookCellTitleInput + text,
        };
      }
      return { ...state, notebookCellInput: state.notebookCellInput + text };
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

  if (state.currentScreen === 'notebook') {
    return handleNotebookKey(state, key);
  }

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

  if (state.activeDialog === 'new_notebook_name') {
    if (key === 'backspace') {
      return {
        ...state,
        newNotebookNameInput: state.newNotebookNameInput.slice(0, -1),
      };
    }
    if (key === 'enter') {
      return reducer(state, {
        type: 'submit_new_notebook_name',
        title: state.newNotebookNameInput,
      });
    }
    if (key.length === 1) {
      return {
        ...state,
        newNotebookNameInput: state.newNotebookNameInput + key,
      };
    }
  }

  if (state.activeDialog === 'conversations') {
    const maxIdx = state.conversations.length;
    if (key === 'up') {
      return {
        ...state,
        conversationsDialogSelected: Math.max(
          0,
          state.conversationsDialogSelected - 1,
        ),
      };
    }
    if (key === 'down') {
      return {
        ...state,
        conversationsDialogSelected: Math.min(
          maxIdx,
          state.conversationsDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      if (state.conversationsDialogSelected === 0) {
        return reducer(state, { type: 'request_new_conversation' });
      }
      const conv = state.conversations[state.conversationsDialogSelected - 1];
      if (conv) {
        return reducer(state, {
          type: 'switch_conversation',
          conversationId: conv.id,
        });
      }
    }
  }

  if (state.activeDialog === 'notebooks') {
    if (key === 'n' && key.length === 1) {
      return reducer(state, { type: 'open_new_notebook_name_dialog' });
    }
    if (key === 'up') {
      return {
        ...state,
        notebooksDialogSelected: Math.max(0, state.notebooksDialogSelected - 1),
      };
    }
    if (key === 'down') {
      const maxIdx = state.projectNotebooks.length;
      return {
        ...state,
        notebooksDialogSelected: Math.min(
          maxIdx,
          state.notebooksDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      if (state.notebooksDialogSelected === 0) {
        return reducer(state, { type: 'open_new_notebook_name_dialog' });
      }
      const notebook =
        state.projectNotebooks[state.notebooksDialogSelected - 1];
      if (notebook) {
        return reducer(state, { type: 'open_notebook', notebook });
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
    const datasourceItems = [...attachedItems, ...availableItems];
    const showAddRow = true;
    const itemCount = showAddRow
      ? 1 + datasourceItems.length
      : datasourceItems.length;
    const maxIdx = itemCount > 0 ? itemCount - 1 : 0;

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
      return {
        ...state,
        datasourcesDialogSelected: Math.min(
          maxIdx,
          state.datasourcesDialogSelected + 1,
        ),
      };
    }
    if (key === 'enter') {
      if (state.datasourcesDialogSelected === 0 && showAddRow) {
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
      }
      if (conv) {
        const item =
          datasourceItems[
            state.datasourcesDialogSelected - (showAddRow ? 1 : 0)
          ];
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

function handleNotebookKey(state: AppState, key: string): AppState {
  const nb = state.currentNotebook;
  if (!nb) return state;
  const cells = nb.cells;
  const idx = state.notebookFocusedCellIndex;
  const cell = cells[idx];

  if (state.notebookEditingCellTitle != null) {
    if (key === 'escape' || key === 'esc') {
      return reducer(state, { type: 'stop_editing_cell_title' });
    }
    if (key === 'backspace') {
      return {
        ...state,
        notebookCellTitleInput: state.notebookCellTitleInput.slice(0, -1),
      };
    }
    if (key === 'enter') {
      return reducer(state, {
        type: 'update_notebook_cell_title',
        cellId: state.notebookEditingCellTitle,
        title: state.notebookCellTitleInput,
      });
    }
    if (key.length === 1) {
      return {
        ...state,
        notebookCellTitleInput: state.notebookCellTitleInput + key,
      };
    }
    return state;
  }

  if (state.notebookCellDatasourcePickerOpen) {
    if (key === 'escape' || key === 'esc') {
      return {
        ...state,
        notebookCellDatasourcePickerOpen: false,
      };
    }
    if (key === 'up') {
      return {
        ...state,
        notebookCellDatasourcePickerSelected: Math.max(
          0,
          state.notebookCellDatasourcePickerSelected - 1,
        ),
      };
    }
    if (key === 'down') {
      const maxDs = Math.max(0, state.projectDatasources.length - 1);
      return {
        ...state,
        notebookCellDatasourcePickerSelected: Math.min(
          maxDs,
          state.notebookCellDatasourcePickerSelected + 1,
        ),
      };
    }
    if (key === 'enter' && cell) {
      const ds =
        state.projectDatasources[state.notebookCellDatasourcePickerSelected];
      if (ds) {
        const next = reducer(state, {
          type: 'set_notebook_cell_datasource',
          cellId: cell.cellId,
          datasourceIds: [ds.id],
        });
        return {
          ...next,
          notebookCellDatasourcePickerOpen: false,
        };
      }
    }
    return state;
  }

  if (key === 'escape' || key === 'esc') {
    return reducer(state, { type: 'close_notebook' });
  }
  if (key === 'backspace') {
    return {
      ...state,
      notebookCellInput: state.notebookCellInput.slice(0, -1),
    };
  }
  if (key.length === 1) {
    return {
      ...state,
      notebookCellInput: state.notebookCellInput + key,
    };
  }
  if (key === 'up') {
    let next = reducer(state, {
      type: 'update_notebook_cell_query',
      cellId: cell?.cellId ?? 0,
      query: state.notebookCellInput,
    });
    next = reducer(next, {
      type: 'notebook_focus_cell',
      index: Math.max(0, idx - 1),
    });
    return next;
  }
  if (key === 'down') {
    let next = reducer(state, {
      type: 'update_notebook_cell_query',
      cellId: cell?.cellId ?? 0,
      query: state.notebookCellInput,
    });
    next = reducer(next, {
      type: 'notebook_focus_cell',
      index: Math.min(cells.length - 1, idx + 1),
    });
    return next;
  }
  if (key === 'ctrl+enter' || key === 'ctrl+return' || key === 'ctrl+j') {
    if (cell?.cellType === 'query' && state.notebookCellInput.trim()) {
      const next = reducer(state, {
        type: 'update_notebook_cell_query',
        cellId: cell.cellId,
        query: state.notebookCellInput,
      });
      return reducer(next, { type: 'run_notebook_cell', cellId: cell.cellId });
    }
  }
  if (key === 'ctrl+o' || key === 'ctrl+;' || key === 'ctrl+shift+n') {
    return reducer(state, { type: 'add_notebook_cell' });
  }
  if (key === 'ctrl+d') {
    return {
      ...state,
      notebookCellDatasourcePickerOpen: true,
      notebookCellDatasourcePickerSelected: 0,
    };
  }
  if ((key === 'f2' || key === 'ctrl+t') && cell) {
    return reducer(state, {
      type: 'start_editing_cell_title',
      cellId: cell.cellId,
    });
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
  if (key === 'ctrl+b') {
    return { ...state, activeDialog: 'notebooks' };
  }
  if (key === 'ctrl+d') {
    return reducer(state, {
      type: 'execute_command',
      action: 'show_datasources',
    });
  }
  if (key === 'ctrl+shift+a') {
    return reducer(state, {
      type: 'execute_command',
      action: 'show_add_datasource',
    });
  }
  if (key === 'ctrl+n') {
    return reducer(state, { type: 'request_new_conversation' });
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
  if (key === 'ctrl+b') {
    return { ...state, activeDialog: 'notebooks' };
  }
  if (key === 'ctrl+d') {
    return reducer(state, {
      type: 'execute_command',
      action: 'show_datasources',
    });
  }
  if (key === 'ctrl+shift+a') {
    return reducer(state, {
      type: 'execute_command',
      action: 'show_add_datasource',
    });
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
  let name = e.name.toLowerCase();
  const arrowMap: Record<string, string> = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
  };
  const mapped = arrowMap[name];
  if (mapped) name = mapped;
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
