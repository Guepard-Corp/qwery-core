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
  const showAddRow = true;
  const maxItems = Math.min(12, state.height - 10);
  const sliceEnd = showAddRow ? maxItems - 1 : maxItems;

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
        ) : (
          <>
            {showAddRow && (
              <box flexDirection="row">
                {state.datasourcesDialogSelected === 0 ? (
                  <text {...commandPaletteItemSelectedStyle}>
                    {'+ Add new datasource'.padEnd(45)} open
                  </text>
                ) : (
                  <text {...commandPaletteItemStyle}>+ Add new datasource</text>
                )}
              </box>
            )}
            {items.slice(0, sliceEnd).map((item, i) => {
              const rowIndex = showAddRow ? i + 1 : i;
              const isSelected = rowIndex === state.datasourcesDialogSelected;
              const label = item.attached ? `[+] ${item.name}` : item.name;
              const display =
                label.length > 45 ? label.slice(0, 42) + '...' : label;
              return (
                <box key={item.id} flexDirection="row">
                  {isSelected ? (
                    <text {...commandPaletteItemSelectedStyle}>
                      {display.padEnd(45)} {item.attached ? '−' : '+'}
                    </text>
                  ) : (
                    <text {...commandPaletteItemStyle}>{display}</text>
                  )}
                </box>
              );
            })}
          </>
        )}
        <box height={1} />
        <text {...messageInfoStyle}>
          Enter: toggle or add new · ctrl+d datasources · ctrl+shift+a add
        </text>
      </box>
    </box>
  );
}
