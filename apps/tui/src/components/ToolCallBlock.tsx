import type { ToolCall, ToolCallStatus } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';
import { TextAttributes } from '@opentui/core';

interface ToolCallBlockProps {
  tool: ToolCall;
  isExpanded?: boolean;
  isFocused?: boolean;
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

export function ToolCallBlock({
  tool,
  isExpanded = false,
  isFocused = false,
}: ToolCallBlockProps) {
  const { colors } = useStyles();
  const statusColor = getStatusColor(tool.status, colors);
  const statusIcon = getStatusIcon(tool.status);
  const toolIcon = getToolIcon(tool.name);
  const expandIcon = isExpanded ? '▼' : '▶';
  const hasDetails =
    (tool.args?.length ?? 0) > 0 || (tool.output?.length ?? 0) > 0;

  return (
    <box flexDirection="column">
      <box
        flexDirection="row"
        {...(isFocused ? { border: true, borderColor: colors.cyan } : {})}
      >
        <text fg={colors.dimGray}>{hasDetails ? `${expandIcon} ` : '  '}</text>
        <text fg={colors.dimGray}>{toolIcon} </text>
        <text fg={colors.cyan} attributes={TextAttributes.BOLD}>
          {tool.name}
        </text>
        <text fg={colors.dimGray}> </text>
        <text fg={statusColor}>{statusIcon}</text>
        {hasDetails && (
          <text fg={colors.dimGray}>
            {' '}
            · Enter to {isExpanded ? 'collapse' : 'expand'}
          </text>
        )}
      </box>
      {isExpanded && hasDetails && (
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
          {tool.args ? (
            <box flexDirection="column" marginBottom={1}>
              <text fg={colors.dimGray}>Args:</text>
              <text fg={colors.white} wrapMode="char">
                {tool.args.length > 500
                  ? tool.args.slice(0, 500) + '…'
                  : tool.args}
              </text>
            </box>
          ) : null}
          {tool.output != null ? (
            <box flexDirection="column">
              <text fg={colors.dimGray}>Output:</text>
              <text
                fg={tool.status === 'error' ? colors.red : colors.white}
                wrapMode="char"
              >
                {tool.output.length > 1000
                  ? tool.output.slice(0, 1000) + '…'
                  : tool.output}
              </text>
            </box>
          ) : null}
        </box>
      )}
    </box>
  );
}

export function ToolCallInline({
  tool,
  isExpanded: _isExpanded,
  isFocused: _isFocused,
}: ToolCallBlockProps) {
  const { colors } = useStyles();
  const statusColor = getStatusColor(tool.status, colors);
  const statusIcon = getStatusIcon(tool.status);
  const toolIcon = getToolIcon(tool.name);

  return (
    <box flexDirection="row">
      <text fg={colors.dimGray}>{toolIcon} </text>
      <text fg={colors.cyan}>{tool.name}</text>
      <text fg={colors.dimGray}> </text>
      <text fg={statusColor}>{statusIcon}</text>
    </box>
  );
}
