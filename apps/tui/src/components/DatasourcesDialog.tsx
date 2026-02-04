import type { AppState } from '../state/types.ts';
import { getCurrentConversation } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface DatasourcesDialogProps {
  state: AppState;
}

export function DatasourcesDialog({ state }: DatasourcesDialogProps) {
  const {
    colors,
    commandPaletteTitleStyle,
    commandPaletteShortcutStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    messageInfoStyle,
  } = useStyles();

  const conv = getCurrentConversation(state);
  const attachedIds = conv?.datasources ?? [];
  const available = state.projectDatasources.filter(
    (d) => !attachedIds.includes(d.id),
  );
  const attachedItems = attachedIds.map((id) => ({
    id,
    name: state.projectDatasources.find((d) => d.id === id)?.name ?? id,
    attached: true,
  }));
  const availableItems = available.map((d) => ({
    id: d.id,
    name: d.name,
    attached: false,
  }));
  const items = [...attachedItems, ...availableItems];
  const maxItems = Math.min(12, state.height - 10);

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
        width={60}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Datasources</text>
          <box flexGrow={1} />
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        {!conv ? (
          <text {...messageInfoStyle}>
            Start a conversation to attach datasources.
          </text>
        ) : items.length === 0 ? (
          <text {...messageInfoStyle}>
            No datasources in project. Add one first.
          </text>
        ) : (
          items.slice(0, maxItems).map((item, i) => {
            const isSelected = i === state.datasourcesDialogSelected;
            const label = item.attached ? `[+] ${item.name}` : item.name;
            const display =
              label.length > 45 ? label.slice(0, 42) + '...' : label;
            return (
              <box key={item.id} flexDirection="row">
                {isSelected ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {display.padEnd(45)} {item.attached ? 'detach' : 'attach'}
                  </text>
                ) : (
                  <text {...commandPaletteItemStyle}>{display}</text>
                )}
              </box>
            );
          })
        )}
        <box height={1} />
        <text {...messageInfoStyle}>
          Enter to attach or detach · Attached shown with [+]
        </text>
      </box>
    </box>
  );
}
