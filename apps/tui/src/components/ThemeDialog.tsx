import type { AppState } from '../state/types.ts';
import { themeIds } from '../theme/index.ts';
import { useStyles } from '../theme/index.ts';

interface ThemeDialogProps {
  state: AppState;
}

export function ThemeDialog({ state }: ThemeDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  return (
    <box
      flexDirection="column"
      width={state.width}
      height={state.height}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={40}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Theme</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {themeIds.map((id, i) => {
          const isSelected = i === state.themeDialogSelected;
          const name = id.charAt(0).toUpperCase() + id.slice(1);
          return (
            <box key={id} flexDirection="row">
              {isSelected ? (
                <text {...commandPaletteItemSelectedStyle}>{name}</text>
              ) : (
                <text {...commandPaletteItemStyle}>{name}</text>
              )}
            </box>
          );
        })}
        <box height={1} />
        <text {...messageInfoStyle}>Enter to apply</text>
      </box>
    </box>
  );
}
