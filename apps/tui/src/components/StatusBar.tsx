import type { MeshStatus } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface StatusBarProps {
  width: number;
  mesh: MeshStatus | null;
  right?: React.ReactNode;
}

export function StatusBar({ width, mesh, right }: StatusBarProps) {
  const { statusBarStyle } = useStyles();
  const leftText = mesh
    ? `servers: ${mesh.servers}, workers: ${mesh.workers}, jobs: ${mesh.jobs}`
    : 'servers: -, workers: -, jobs: -';
  return (
    <box flexDirection="row" width={width}>
      <text {...statusBarStyle}>{leftText}</text>
      <box flexGrow={1} />
      {right ?? <text {...statusBarStyle}>1.0.0</text>}
    </box>
  );
}
