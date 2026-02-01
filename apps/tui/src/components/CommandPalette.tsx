import type { CommandItem } from '../state/types.ts';
import { useStyles } from '../theme/index.ts';

interface CommandPaletteProps {
  search: string;
  filteredItems: CommandItem[];
  selected: number;
  width: number;
  height: number;
}

const CATEGORIES = ['Conversation', 'System'];

export function CommandPalette({
  search,
  filteredItems,
  selected,
  width,
  height,
}: CommandPaletteProps) {
  const {
    commandPaletteTitleStyle,
    commandPaletteSearchStyle,
    commandPaletteCategoryStyle,
    commandPaletteItemStyle,
    commandPaletteItemSelectedStyle,
    commandPaletteShortcutStyle,
    placeholderStyle,
    colors,
  } = useStyles();
  const searchDisplay =
    search === '' ? (
      <text {...placeholderStyle}>_</text>
    ) : (
      <text>{search}_</text>
    );
  const itemWidth = 46;
  let globalIdx = 0;
  const categorySections = CATEGORIES.map((category) => {
    const hasItems = filteredItems.some((item) => item.category === category);
    if (!hasItems) return null;
    const items = filteredItems
      .filter((item) => item.category === category)
      .map((item) => {
        const currentIdx = globalIdx++;
        const isSelected = currentIdx === selected;
        const nameLen = item.name.length;
        const shortcutLen = item.shortcut.length;
        const spacesNeeded = Math.max(1, itemWidth - nameLen - shortcutLen);
        const line = item.name + ' '.repeat(spacesNeeded) + item.shortcut;
        return (
          <box key={item.name + item.shortcut} flexDirection="row">
            {isSelected ? (
              <text {...commandPaletteItemSelectedStyle}>{line}</text>
            ) : (
              <>
                <text {...commandPaletteItemStyle}>{item.name}</text>
                <text>{' '.repeat(spacesNeeded)}</text>
                <text {...commandPaletteShortcutStyle}>{item.shortcut}</text>
              </>
            )}
          </box>
        );
      });
    return (
      <box key={category} flexDirection="column">
        <text {...commandPaletteCategoryStyle}>{category}</text>
        {items}
      </box>
    );
  }).filter(Boolean);

  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={50}
        border={true}
        borderStyle="rounded"
        borderColor={colors.dimGray}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="row">
          <text {...commandPaletteTitleStyle}>Commands</text>
          <text> </text>
          <text {...commandPaletteShortcutStyle}>esc</text>
        </box>
        <box height={1} />
        <text {...commandPaletteSearchStyle}>Search</text>
        {searchDisplay}
        <box height={1} />
        {categorySections}
      </box>
    </box>
  );
}
