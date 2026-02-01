import type { AppState, CommandItem } from './types.ts';

export function defaultCommandItems(): CommandItem[] {
  return [
    {
      name: 'New conversation',
      shortcut: 'ctrl+n',
      category: 'Conversation',
      action: 'new_conversation',
    },
    {
      name: 'Conversations',
      shortcut: 'ctrl+l',
      category: 'Conversation',
      action: 'show_conversations',
    },
    { name: 'Theme', shortcut: '', category: 'System', action: 'show_theme' },
    { name: 'Export', shortcut: '', category: 'System', action: 'show_export' },
    { name: 'Stash', shortcut: '', category: 'System', action: 'show_stash' },
    {
      name: 'Stash current',
      shortcut: 'ctrl+s',
      category: 'System',
      action: 'stash_current',
    },
    { name: 'Agent', shortcut: '', category: 'System', action: 'show_agent' },
    { name: 'Model', shortcut: '', category: 'System', action: 'show_model' },
    {
      name: 'Help',
      shortcut: 'ctrl+?',
      category: 'System',
      action: 'show_help',
    },
  ];
}

export function initialState(): AppState {
  return {
    width: 80,
    height: 24,
    currentScreen: 'home',
    activeDialog: 'none',
    themeId: 'default',
    input: '',
    menuItems: ['Query', 'Ask'],
    selectedIdx: 0,
    commandPaletteSearch: '',
    commandPaletteItems: defaultCommandItems(),
    commandPaletteSelected: 0,
    conversations: [],
    currentConversationId: null,
    chatInput: '',
    agentBusy: false,
    loaderPhase: 0,
    pendingUserMessage: '',
    meshStatus: null,
    promptHistory: [],
    promptHistoryIndex: -1, // -1 = current input, 0+ = browsing history
    stashEntries: [],
    stashSelected: 0,
    selectedAgentId: 'query',
    selectedModelId: 'qwery-engine',
    exportFilename: 'conversation.md',
    exportThinking: true,
    exportToolDetails: true,
    themeDialogSelected: 0,
    agentDialogSelected: 0,
    modelDialogSelected: 0,
  };
}
