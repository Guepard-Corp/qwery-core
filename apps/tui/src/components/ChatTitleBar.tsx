import { useStyles } from '../theme/index.ts';

interface ChatTitleBarProps {
  title: string;
  width: number;
}

export function ChatTitleBar({ title, width }: ChatTitleBarProps) {
  const { chatTitleStyle, messageInfoStyle, colors } = useStyles();
  const stats = '16,799  8% ($0.00) v1.1.47';
  return (
    <box flexDirection="row" width={width}>
      <text {...chatTitleStyle} bg={colors.chatTitleBg}>
        # {title}
      </text>
      <box flexGrow={1} />
      <text {...messageInfoStyle}>{stats}</text>
    </box>
  );
}
