import type { MeshStatus } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface ChatStatusBarProps {
  width: number;
  mesh: MeshStatus | null;
}

export function ChatStatusBar({ width, mesh }: ChatStatusBarProps) {
  const { statusBarStyle, keyStyle, keyDescStyle } = useStyles();
  const leftText = mesh
    ? `servers: ${mesh.servers}, workers: ${mesh.workers}, jobs: ${mesh.jobs}`
    : 'servers: -, workers: -, jobs: -';
  return (
    <box flexDirection="row" width={width}>
      <text {...statusBarStyle}>{leftText}</text>
      <box flexGrow={1} />
      <text {...keyStyle}>ctrl+t</text>
      <text {...keyDescStyle}> variants </text>
      <text {...keyStyle}>tab</text>
      <text {...keyDescStyle}> tools </text>
      <text {...keyStyle}>ctrl+p</text>
      <text {...keyDescStyle}> commands</text>
    </box>
  );
}
