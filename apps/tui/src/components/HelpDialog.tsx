import { useStyles } from '../theme/index.ts';

interface HelpDialogProps {
  width: number;
  height: number;
}

const KEYBINDINGS = [
  { key: 'ctrl+p', desc: 'Command palette' },
  { key: 'ctrl+l', desc: 'Conversations list' },
  { key: 'ctrl+n', desc: 'New conversation' },
  { key: 'ctrl+d', desc: 'Datasources (attach/detach)' },
  { key: 'ctrl+shift+a', desc: 'Add new datasource' },
  { key: 'ctrl+b', desc: 'Notebooks list' },
  { key: 'ctrl+s', desc: 'Stash current prompt' },
  { key: 'ctrl+v', desc: 'Paste from clipboard' },
  { key: 'ctrl+?', desc: 'Help' },
  { key: 'escape', desc: 'Back / Close dialog' },
  { key: 'enter', desc: 'Submit / Open selected' },
  { key: 'tab', desc: 'Switch Query/Ask (home)' },
  { key: 'tab / ctrl+up', desc: 'Focus tools (chat)' },
  { key: 'enter (on tool)', desc: 'Expand / collapse tool' },
  { key: 'ctrl+down / esc', desc: 'Unfocus tools' },
  { key: 'up/down', desc: 'Move / Prompt history' },
  { key: 'ctrl+c', desc: 'Quit' },
];

const NOTEBOOK_KEYS = [
  { key: 'escape', desc: 'Close notebook' },
  { key: 'up / down', desc: 'Focus previous/next cell' },
  { key: 'type / backspace', desc: 'Edit SQL in focused cell' },
  { key: 'ctrl+enter / ctrl+j', desc: 'Run focused SQL cell' },
  { key: 'ctrl+o', desc: 'New cell' },
  { key: 'ctrl+d', desc: 'Set cell datasource' },
  { key: 'f2 / ctrl+t', desc: 'Rename cell' },
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
        <box height={1} />
        <text fg={colors.orange}>Notebook (when open)</text>
        <box height={1} />
        {NOTEBOOK_KEYS.map((kb) => (
          <box key={kb.key} flexDirection="row">
            <text {...keyStyle} width={14}>
              {kb.key}
            </text>
            <text {...keyDescStyle}>{kb.desc}</text>
          </box>
        ))}
      </box>
    </box>
  );
}
