import { useStyles } from '../theme/index.ts';

export function Shortcuts() {
  const { keyStyle, keyDescStyle } = useStyles();
  return (
    <box flexDirection="row">
      <text {...keyStyle}>tab</text>
      <text {...keyDescStyle}> switch mode </text>
      <text {...keyStyle}>ctrl+p</text>
      <text {...keyDescStyle}> commands</text>
    </box>
  );
}
