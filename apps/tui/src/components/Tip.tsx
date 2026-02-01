import { useStyles } from '../theme/index.ts';

export function Tip() {
  const { tipDotStyle, tipLabelStyle, tipTextStyle, tipHighlightStyle } =
    useStyles();
  return (
    <box flexDirection="row">
      <text {...tipDotStyle}>● </text>
      <text {...tipLabelStyle}>Tip </text>
      <text {...tipTextStyle}>Type </text>
      <text {...tipHighlightStyle}>@</text>
      <text {...tipTextStyle}>
        {' '}
        followed by a filename to fuzzy search and attach files
      </text>
    </box>
  );
}
