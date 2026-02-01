import type { Conversation } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface ConversationsDialogProps {
  conversations: Conversation[];
  selectedId: string | null;
  width: number;
  height: number;
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

export function ConversationsDialog({
  conversations,
  selectedId,
  width,
  height,
}: ConversationsDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();
  const maxItems = Math.min(10, height - 10);

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
        width={60}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Conversations</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {conversations.length === 0 ? (
          <text {...messageInfoStyle}>No conversations yet</text>
        ) : (
          conversations.slice(0, maxItems).map((conv) => {
            const isSelected = conv.id === selectedId;
            const msgCount = conv.messages.length;
            const timeStr = formatTime(conv.updatedAt);
            const title =
              conv.title.length > 35
                ? conv.title.slice(0, 32) + '...'
                : conv.title;

            return (
              <box key={conv.id} flexDirection="row">
                {isSelected ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {title.padEnd(38)} {msgCount} msgs · {timeStr}
                  </text>
                ) : (
                  <>
                    <text {...commandPaletteItemStyle}>{title}</text>
                    <box flexGrow={1} />
                    <text {...messageInfoStyle}>
                      {msgCount} msgs · {timeStr}
                    </text>
                  </>
                )}
              </box>
            );
          })
        )}
        {conversations.length > maxItems && (
          <text {...messageInfoStyle}>
            ... and {conversations.length - maxItems} more
          </text>
        )}
        <box height={1} />
        <text {...messageInfoStyle}>Press enter to open, ctrl+n for new</text>
      </box>
    </box>
  );
}
