import type { AppState } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface StashDialogProps {
  state: AppState;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function StashDialog({ state }: StashDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  const entries = state.stashEntries;
  const maxItems = Math.min(10, state.height - 10);

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
        width={60}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Stash</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {entries.length === 0 ? (
          <text {...messageInfoStyle}>
            No stashed prompts. Stash from command palette.
          </text>
        ) : (
          entries.slice(0, maxItems).map((entry, i) => {
            const isSelected = i === state.stashSelected;
            const preview =
              entry.input.length > 50
                ? entry.input.slice(0, 47) + '...'
                : entry.input;
            const timeStr = formatTime(entry.timestamp);
            return (
              <box key={i} flexDirection="row">
                {isSelected ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {preview.padEnd(45)} {timeStr}
                  </text>
                ) : (
                  <>
                    <text {...commandPaletteItemStyle}>{preview}</text>
                    <box flexGrow={1} />
                    <text {...messageInfoStyle}>{timeStr}</text>
                  </>
                )}
              </box>
            );
          })
        )}
        <box height={1} />
        <text {...messageInfoStyle}>
          Enter to restore · ctrl+s to stash current
        </text>
      </box>
    </box>
  );
}
