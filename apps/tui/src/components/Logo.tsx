import { useStyles } from '../theme/index.ts';

const LOGO_LINES = [
  '██████╗ ██╗    ██╗███████╗██████╗ ██╗   ██╗',
  '██╔══██╗██║    ██║██╔════╝██╔══██╗╚██╗ ██╔╝',
  '██║  ██║██║ █╗ ██║█████╗  ██████╔╝ ╚████╔╝ ',
  '██║▄▄██║██║███╗██║██╔══╝  ██╔══██╗  ╚██╔╝  ',
  '╚██████╔╝╚███╔███╔╝███████╗██║  ██║   ██║   ',
  ' ╚══▀▀═╝  ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ',
];

export function Logo() {
  const { logoDim, logoBright } = useStyles();
  return (
    <box flexDirection="column">
      {LOGO_LINES.map((line, i) => {
        const runes = [...line];
        const midPoint = Math.floor(runes.length * 0.6);
        const dimPart = runes.slice(0, midPoint).join('');
        const brightPart = runes.slice(midPoint).join('');
        return (
          <box key={i} flexDirection="row">
            <text {...logoDim}>{dimPart}</text>
            <text {...logoBright}>{brightPart}</text>
          </box>
        );
      })}
    </box>
  );
}
