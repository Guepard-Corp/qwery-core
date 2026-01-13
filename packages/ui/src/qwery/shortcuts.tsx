import { cn } from '../lib/utils';
import { Kbd, KbdGroup } from '../shadcn/kbd';

export interface ShortcutItem {
  text: string;
  keys: string[];
  highlighted?: boolean;
}

export interface ShortcutsProps {
  items: ShortcutItem[];
  className?: string;
}

const keySymbols: Record<string, string> = {
  '⇧': '⇧',
  Shift: '⇧',
  '⌘': '⌘',
  Cmd: '⌘',
  Command: '⌘',
  '⌥': '⌥',
  Option: '⌥',
  Alt: '⌥',
  '⌃': '⌃',
  Ctrl: '⌃',
  Control: '⌃',
};

function getKeySymbol(key: string): string {
  return keySymbols[key] || key;
}

export function Shortcuts({ items, className }: ShortcutsProps) {
  return (
    <div
      className={cn(
        'bg-popover text-popover-foreground min-w-[120px] rounded-lg border p-1.5 shadow-md',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center justify-between rounded-md px-2 py-1.5 text-sm',
            item.highlighted && 'bg-accent text-accent-foreground',
          )}
        >
          <span className="text-foreground">{item.text}</span>
          <KbdGroup>
            {item.keys.map((key, keyIndex) => (
              <Kbd key={keyIndex}>{getKeySymbol(key)}</Kbd>
            ))}
          </KbdGroup>
        </div>
      ))}
    </div>
  );
}
