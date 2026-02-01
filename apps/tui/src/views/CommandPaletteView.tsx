import type { AppState } from '../state/types.ts';
import { getFilteredCommandItems } from '../state/reducer.ts';
import { CommandPalette } from '../components/CommandPalette.tsx';

interface CommandPaletteViewProps {
  state: AppState;
}

export function CommandPaletteView({ state }: CommandPaletteViewProps) {
  const filtered = getFilteredCommandItems(state);
  return (
    <CommandPalette
      search={state.commandPaletteSearch}
      filteredItems={filtered}
      selected={state.commandPaletteSelected}
      width={state.width}
      height={state.height}
    />
  );
}
