import { useStyles } from '../theme/index.ts';

interface HelpDialogProps {
  width: number;
  height: number;
}

const KEYBINDINGS = [
  { key: 'ctrl+p', desc: 'Command palette' },
  { key: 'ctrl+l', desc: 'Conversations' },
  { key: 'ctrl+n', desc: 'New conversation' },
  { key: 'ctrl+s', desc: 'Stash current prompt' },
  { key: 'ctrl+?', desc: 'Help' },
  { key: 'escape', desc: 'Back / Cancel' },
  { key: 'enter', desc: 'Submit' },
  { key: 'tab', desc: 'Switch mode' },
  { key: 'up/down', desc: 'Prompt history (when input empty)' },
  { key: 'ctrl+c', desc: 'Quit' },
];

export function HelpDialog({ width, height }: HelpDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    keyStyle,
    keyDescStyle,
    commandPaletteShortcutStyle,
  } = useStyles();
  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
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
          <text {...commandPaletteTitleStyle}>Help</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        <text fg={colors.orange}>Keyboard Shortcuts</text>
        <box height={1} />
        {KEYBINDINGS.map((kb) => (
          <box key={kb.key} flexDirection="row">
            <text {...keyStyle} width={12}>
              {kb.key}
            </text>
            <text {...keyDescStyle}>{kb.desc}</text>
          </box>
        ))}
        <box height={1} />
        <text fg={colors.orange}>Modes</text>
        <box height={1} />
        <box flexDirection="row">
          <text {...keyStyle} width={12}>
            Query
          </text>
          <text {...keyDescStyle}>Execute SQL queries</text>
        </box>
        <box flexDirection="row">
          <text {...keyStyle} width={12}>
            Ask
          </text>
          <text {...keyDescStyle}>Chat with AI assistant</text>
        </box>
      </box>
    </box>
  );
}
