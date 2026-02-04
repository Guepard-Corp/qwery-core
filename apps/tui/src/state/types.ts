export type Screen = 'home' | 'chat';

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
  | 'add_datasource';

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
}

export function getCurrentConversation(state: AppState): Conversation | null {
  if (!state.currentConversationId) return null;
  return (
    state.conversations.find((c) => c.id === state.currentConversationId) ??
    null
  );
}
