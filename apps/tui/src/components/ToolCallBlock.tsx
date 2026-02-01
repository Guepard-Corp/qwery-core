import type { ToolCall, ToolCallStatus } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';
import { TextAttributes } from '@opentui/core';

interface ToolCallBlockProps {
  tool: ToolCall;
}

function getStatusColor(
  status: ToolCallStatus,
  colors: { green: string; red: string; yellow: string; dimGray: string },
): string {
  switch (status) {
    case 'success':
      return colors.green;
    case 'error':
      return colors.red;
    case 'running':
      return colors.yellow;
    default:
      return colors.dimGray;
  }
}

function getStatusIcon(status: ToolCallStatus): string {
  switch (status) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'running':
      return '⋯';
    default:
      return '○';
  }
}

function getToolIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'bash' || lower === 'shell') return '$';
  if (lower === 'read') return '📄';
  if (lower === 'write') return '✏️';
  if (lower === 'edit') return '📝';
  if (lower === 'webfetch' || lower === 'fetch') return '🌐';
  if (lower === 'grep' || lower === 'search') return '🔍';
  if (lower === 'glob' || lower === 'list') return '📁';
  return '%';
}

export function ToolCallBlock({ tool }: ToolCallBlockProps) {
  const { colors } = useStyles();
  const statusColor = getStatusColor(tool.status, colors);
  const statusIcon = getStatusIcon(tool.status);
  const toolIcon = getToolIcon(tool.name);
  const outputText = tool.output ?? '';
  const hasOutput = outputText.length > 0;

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg={colors.dimGray}>{toolIcon} </text>
        <text fg={colors.cyan} attributes={TextAttributes.BOLD}>
          {tool.name}
        </text>
        <text fg={colors.dimGray}> </text>
        <text fg={colors.blue}>{tool.args}</text>
        <text> </text>
        <text fg={statusColor}>{statusIcon}</text>
      </box>
      {hasOutput && (
        <box
          flexDirection="column"
          marginLeft={2}
          marginTop={0}
          marginBottom={1}
          border={true}
          borderStyle="rounded"
          borderColor={tool.status === 'error' ? colors.red : colors.dimGray}
          paddingLeft={1}
          paddingRight={1}
        >
          <text
            fg={tool.status === 'error' ? colors.red : colors.white}
            wrapMode="char"
          >
            {outputText}
          </text>
        </box>
      )}
    </box>
  );
}

export function ToolCallInline({ tool }: ToolCallBlockProps) {
  const { colors } = useStyles();
  const statusColor = getStatusColor(tool.status, colors);
  const statusIcon = getStatusIcon(tool.status);
  const toolIcon = getToolIcon(tool.name);

  return (
    <box flexDirection="row">
      <text fg={colors.dimGray}>{toolIcon} </text>
      <text fg={colors.cyan}>{tool.name}</text>
      <text fg={colors.dimGray}> </text>
      <text fg={colors.blue}>{tool.args}</text>
      <text> </text>
      <text fg={statusColor}>{statusIcon}</text>
    </box>
  );
}
