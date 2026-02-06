import { useStyles } from '../theme/index.ts';

export function Tip() {
  const { tipDotStyle, tipLabelStyle, tipTextStyle, tipHighlightStyle } =
    useStyles();
  return (
    <box flexDirection="row">
      <text {...tipDotStyle}>● </text>
      <text {...tipLabelStyle}>Tip </text>
      <text {...tipTextStyle}>Connect a datasource in the web app,</text>
      <text> </text>
      <text {...tipHighlightStyle}>then chat with it here.</text>
    </box>
  );
}
