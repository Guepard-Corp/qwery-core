import { TextAttributes } from '@opentui/core';
import type { Conversation } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

const SIDEBAR_WIDTH = 36;

interface SidebarProps {
  conversation: Conversation | null;
  height: number;
}

function estimateTokens(messages: Conversation['messages']): number {
  let total = 0;
  for (const msg of messages) {
    total += msg.content.split(/\s+/).length * 2;
    for (const tool of msg.toolCalls) {
      total += (tool.args?.length ?? 0) / 4;
      total += (tool.output?.length ?? 0) / 4;
    }
  }
  return Math.round(total);
}

export function Sidebar({ conversation, height }: SidebarProps) {
  const { colors, keyStyle, keyDescStyle } = useStyles();

  const tokens = conversation ? estimateTokens(conversation.messages) : 0;
  const cost = '$0.00';
  const version = '1.0.0';

  return (
    <box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      height={height}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <scrollbox flexGrow={1}>
        <box flexDirection="column" gap={1}>
          {conversation && (
            <>
              <box flexDirection="column">
                <text fg={colors.white} attributes={TextAttributes.BOLD}>
                  {conversation.title}
                </text>
              </box>
              <box flexDirection="column">
                <text {...keyStyle}>Context</text>
                <text {...keyDescStyle}>{tokens.toLocaleString()} tokens</text>
                <text {...keyDescStyle}>{cost} spent</text>
              </box>
            </>
          )}
          <box flexDirection="column">
            <text {...keyDescStyle}>v{version}</text>
          </box>
        </box>
      </scrollbox>
    </box>
  );
}
