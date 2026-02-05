export type Screen = 'home' | 'chat' | 'notebook';

export type DialogType =
  | 'none'
  | 'command'
  | 'help'
  | 'conversations'
  | 'theme'
  | 'export'
  | 'stash'
  | 'agent'
  | 'model'
  | 'datasources'
  | 'add_datasource'
  | 'notebooks'
  | 'new_notebook_name';

export interface MeshStatus {
  servers: number;
  workers: number;
  jobs: number;
}

export type MessageRole = 'user' | 'assistant';

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCall {
  name: string;
  args: string;
  output?: string;
  status: ToolCallStatus;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  toolCalls: ToolCall[];
  model: string;
  duration: string;
  timestamp?: number;
}

export interface Workspace {
  projectId: string | null;
  userId: string;
  username: string;
}

export interface Conversation {
  id: string;
  slug?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  datasources?: string[];
}

export interface CommandItem {
  name: string;
  shortcut: string;
  category: string;
  action?: string;
}

export interface ProjectDatasource {
  id: string;
  name: string;
  slug?: string;
}

export type StreamingToolCall = { name: string; status: ToolCallStatus };

export interface AppState {
  width: number;
  height: number;
  currentScreen: Screen;
  activeDialog: DialogType;
  themeId: string;
  input: string;
  menuItems: string[];
  selectedIdx: number;
  commandPaletteSearch: string;
  commandPaletteItems: CommandItem[];
  commandPaletteSelected: number;
  workspace: Workspace | null;
  projectDatasources: ProjectDatasource[];
  conversations: Conversation[];
  currentConversationId: string | null;
  chatInput: string;
  agentBusy: boolean;
  loaderPhase: number;
  pendingUserMessage: string;
  streamingAgentContent: string;
  streamingToolCalls: StreamingToolCall[];
  expandedToolKeys: Record<string, boolean>;
  focusedToolFlatIndex: number | null;
  meshStatus: MeshStatus | null;
  promptHistory: string[];
  promptHistoryIndex: number;
  stashEntries: { input: string; timestamp: number }[];
  stashSelected: number;
  selectedAgentId: string;
  selectedModelId: string;
  exportFilename: string;
  exportThinking: boolean;
  exportToolDetails: boolean;
  themeDialogSelected: number;
  agentDialogSelected: number;
  modelDialogSelected: number;
  datasourcesDialogSelected: number;
  pendingConversationDatasourceSync: string | null;
  addDatasourceStep: 'type' | 'form';
  addDatasourceTypeIds: string[];
  addDatasourceTypeNames: string[];
  addDatasourceTypeSelected: number;
  addDatasourceTypeId: string | null;
  addDatasourceName: string;
  addDatasourceConnection: string;
  addDatasourceFormSelected: number;
  pendingAddDatasource: {
    typeId: string;
    name: string;
    connection: string;
  } | null;
  addDatasourceValidationError: string | null;
  addDatasourceTestStatus: 'idle' | 'pending' | 'ok' | 'error';
  addDatasourceTestMessage: string;
  addDatasourceTestRequest: boolean;
  requestNewConversation: boolean;
  projectNotebooks: TuiNotebook[];
  currentNotebook: TuiNotebook | null;
  notebookCellResults: Record<
    string,
    { rows: unknown[]; headers: { name: string }[] }
  >;
  notebookCellErrors: Record<string, string>;
  notebookCellLoading: number | null;
  notebooksDialogSelected: number;
  notebookFocusedCellIndex: number;
  notebookCellInput: string;
  notebookCellDatasourcePickerOpen: boolean;
  notebookCellDatasourcePickerSelected: number;
  notebookPendingSave: boolean;
  newNotebookNameInput: string;
  pendingNewNotebookTitle: string | null;
  requestNewNotebook: boolean;
  notebookEditingCellTitle: number | null;
  notebookCellTitleInput: string;
  conversationsDialogSelected: number;
  notebookCreateError: string | null;
}

export interface TuiNotebook {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  slug: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  datasources: string[];
  cells: TuiNotebookCell[];
  createdBy?: string;
  isPublic?: boolean;
}

export interface TuiNotebookCell {
  cellId: number;
  cellType: string;
  query?: string;
  datasources: string[];
  isActive: boolean;
  runMode: string;
  title?: string;
}

export function getCurrentConversation(state: AppState): Conversation | null {
  if (!state.currentConversationId) return null;
  return (
    state.conversations.find((c) => c.id === state.currentConversationId) ??
    null
  );
}
