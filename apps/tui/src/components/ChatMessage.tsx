import type { ChatMessage as ChatMessageType } from '../state/types.ts';
import { ToolCallBlock } from './ToolCallBlock.tsx';
import { useStyles } from '../theme/index.ts';
import { TextAttributes } from '@opentui/core';

interface ChatMessageProps {
  msg: ChatMessageType;
  width?: number;
}

function renderMarkdownLine(
  line: string,
  colors: { white: string; cyan: string; chatTitleBg: string },
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = line;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: {
      idx: number;
      len: number;
      type: 'bold' | 'code';
      content: string;
    } | null = null;

    if (boldMatch && boldMatch.index !== undefined && boldMatch[1]) {
      firstMatch = {
        idx: boldMatch.index,
        len: boldMatch[0].length,
        type: 'bold',
        content: boldMatch[1],
      };
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch[1]) {
      if (!firstMatch || codeMatch.index < firstMatch.idx) {
        firstMatch = {
          idx: codeMatch.index,
          len: codeMatch[0].length,
          type: 'code',
          content: codeMatch[1],
        };
      }
    }

    if (firstMatch) {
      if (firstMatch.idx > 0) {
        const before = remaining.slice(0, firstMatch.idx);
        elements.push(
          <span key={keyIdx++} fg={colors.white}>
            {before}
          </span>,
        );
      }
      if (firstMatch.type === 'bold') {
        const boldContent = firstMatch.content;
        elements.push(
          <span
            key={keyIdx++}
            fg={colors.white}
            attributes={TextAttributes.BOLD}
          >
            {boldContent}
          </span>,
        );
      } else {
        const codeContent = firstMatch.content;
        elements.push(
          <span key={keyIdx++} fg={colors.cyan} bg={colors.chatTitleBg}>
            {codeContent}
          </span>,
        );
      }
      remaining = remaining.slice(firstMatch.idx + firstMatch.len);
    } else {
      elements.push(
        <span key={keyIdx++} fg={colors.white}>
          {remaining}
        </span>,
      );
      break;
    }
  }

  return elements;
}

export function ChatMessage({ msg, width }: ChatMessageProps) {
  const { messageInfoStyle, modelNameStyle, statusDotStyle, colors } =
    useStyles();

  if (msg.role === 'user') {
    const effectiveWidth = width ?? 80;
    const lines = msg.content.split('\n');

    return (
      <box flexDirection="column" width={effectiveWidth}>
        {lines.map((line, i) => {
          const paddedLine = ` ${line}`.padEnd(effectiveWidth, ' ');
          return (
            <text key={i} bg={colors.userPromptBg} fg={colors.white}>
              {paddedLine}
            </text>
          );
        })}
      </box>
    );
  }

  const contentLines = msg.content ? msg.content.split('\n') : [];

  return (
    <box flexDirection="column">
      {msg.toolCalls.map((tool, i) => (
        <ToolCallBlock key={i} tool={tool} />
      ))}
      {msg.content && (
        <box
          flexDirection="column"
          marginTop={msg.toolCalls.length > 0 ? 1 : 0}
        >
          {contentLines.map((line, i) => (
            <text key={i} wrapMode="word">
              {renderMarkdownLine(line, colors)}
            </text>
          ))}
        </box>
      )}
      {(msg.model || msg.duration) && (
        <box flexDirection="row" marginTop={1}>
          <text {...statusDotStyle}>■</text>
          <text> </text>
          <text {...modelNameStyle}>{msg.model}</text>
          {msg.duration ? (
            <text {...messageInfoStyle}> · {msg.duration}</text>
          ) : null}
        </box>
      )}
    </box>
  );
}
