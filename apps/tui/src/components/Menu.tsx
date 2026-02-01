import { useStyles } from '../theme/index.ts';

interface MenuProps {
  items: string[];
  selected: number;
}

export function Menu({ items, selected }: MenuProps) {
  const { inputBorderColorQuery, inputBorderColorAsk } = useStyles();
  if (items.length === 0 || selected < 0 || selected >= items.length)
    return null;
  const color = selected === 0 ? inputBorderColorQuery : inputBorderColorAsk;
  return <text fg={color}>{items[selected]}</text>;
}
