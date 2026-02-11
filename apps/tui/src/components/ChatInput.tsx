import { useStyles } from '../theme/index.ts';
import { BlinkingCursor } from './BlinkingCursor.tsx';

interface ChatInputProps {
  value: string;
  width: number;
}

export function ChatInput({ value, width }: ChatInputProps) {
  const { chatInputContainerStyle } = useStyles();
  const inputWidth = Math.max(20, width - 4);
  return (
    <box
      {...chatInputContainerStyle}
      width={inputWidth}
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        {value}
        <BlinkingCursor />
      </text>
    </box>
  );
}
