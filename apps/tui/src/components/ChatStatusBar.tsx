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
      <text {...keyStyle}>ctrl+n</text>
      <text {...keyDescStyle}> new conv </text>
      <text {...keyStyle}>ctrl+l</text>
      <text {...keyDescStyle}> convos </text>
      <text {...keyStyle}>ctrl+d</text>
      <text {...keyDescStyle}> datasrc </text>
      <text {...keyStyle}>ctrl+shift+a</text>
      <text {...keyDescStyle}> add ds </text>
      <text {...keyStyle}>ctrl+b</text>
      <text {...keyDescStyle}> notebooks </text>
      <text {...keyStyle}>ctrl+p</text>
      <text {...keyDescStyle}> commands </text>
      <text {...keyStyle}>ctrl+?</text>
      <text {...keyDescStyle}> help</text>
    </box>
  );
}
