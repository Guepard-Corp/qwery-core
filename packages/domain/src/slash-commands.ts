export interface SlashCommand {
  name: string;
  label: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'models', label: '/models', description: 'Connect or switch an LLM provider' },
  { name: 'datasources', label: '/datasources', description: 'Manage datasources (add, attach, delete)' },
  { name: 'agents', label: '/agents', description: 'List built-in agents and persisted subagents' },
  { name: 'context', label: '/context', description: 'Show context usage breakdown' },
  { name: 'data', label: '/data', description: 'Pin routing to the DataAgent for upcoming turns' },
  { name: 'code', label: '/code', description: 'Pin routing to the CodingAgent for upcoming turns' },
  { name: 'audit', label: '/audit', description: 'Pin routing to the DB Audit agent' },
  { name: 'optimize', label: '/optimize', description: 'Pin routing to the Query Optimizer agent' },
  { name: 'auto', label: '/auto', description: 'Unpin agent routing (heuristic per turn)' },
  { name: 'layout', label: '/layout', description: 'Toggle focus / split layout (also Ctrl+B)' },
  { name: 'resume', label: '/resume', description: 'Resume a previous session' },
  { name: 'clear', label: '/clear', description: 'Reset the current session' },
  { name: 'help', label: '/help', description: 'Show keys and available commands' },
  { name: 'logs', label: '/logs', description: 'Print the log file path' },
  { name: 'update', label: '/update', description: 'Check for qwery/GFS updates (applied on next launch)' },
  { name: 'quit', label: '/quit', description: 'Exit the app' },
];

export function matchCommands(buffer: string): SlashCommand[] {
  if (!buffer.startsWith('/')) return [];
  const needle = buffer.slice(1).toLowerCase();
  if (needle.length === 0) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(needle));
}
