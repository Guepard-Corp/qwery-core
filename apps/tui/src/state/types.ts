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
  | 'model';

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

export interface Conversation {
  id: string;
  slug?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface CommandItem {
  name: string;
  shortcut: string;
  category: string;
  action?: string;
}

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
  conversations: Conversation[];
  currentConversationId: string | null;
  chatInput: string;
  agentBusy: boolean;
  loaderPhase: number;
  pendingUserMessage: string;
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
}

export function getCurrentConversation(state: AppState): Conversation | null {
  if (!state.currentConversationId) return null;
  return (
    state.conversations.find((c) => c.id === state.currentConversationId) ??
    null
  );
}
