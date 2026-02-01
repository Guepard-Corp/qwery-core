import type { AppState } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

const AGENTS = [
  { id: 'query', name: 'Query', desc: 'Execute SQL queries' },
  { id: 'ask', name: 'Ask', desc: 'Chat with AI assistant' },
];

interface AgentDialogProps {
  state: AppState;
}

export function AgentDialog({ state }: AgentDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  return (
    <box
      flexDirection="column"
      width={state.width}
      height={state.height}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={50}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Agent</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {AGENTS.map((agent, i) => {
          const isSelected = i === state.agentDialogSelected;
          return (
            <box key={agent.id} flexDirection="column">
              {isSelected ? (
                <text {...commandPaletteItemSelectedStyle}>
                  {agent.name} · {agent.desc}
                </text>
              ) : (
                <>
                  <text {...commandPaletteItemStyle}>{agent.name}</text>
                  <text {...messageInfoStyle}> {agent.desc}</text>
                </>
              )}
            </box>
          );
        })}
        <box height={1} />
        <text {...messageInfoStyle}>Enter to select</text>
      </box>
    </box>
  );
}
