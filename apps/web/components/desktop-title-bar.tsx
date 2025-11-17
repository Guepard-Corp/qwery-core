'use client';

import { useEffect, useState } from 'react';

import { Minus, Maximize2, X, Square, ChevronDown } from 'lucide-react';

import { getDesktopApi, isDesktopApp } from '@qwery/shared/desktop';
import { cn } from '@qwery/ui/utils';

import { LogoImage } from './app-logo';

interface MenuItem {
  label: string;
  action?: () => void;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'File',
    submenu: [
      { label: 'New Project', action: () => console.log('New Project') },
      { label: 'Open Project', action: () => console.log('Open Project') },
      { label: 'Save', action: () => console.log('Save') },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', action: () => console.log('Undo') },
      { label: 'Redo', action: () => console.log('Redo') },
      { label: 'Cut', action: () => console.log('Cut') },
      { label: 'Copy', action: () => console.log('Copy') },
      { label: 'Paste', action: () => console.log('Paste') },
    ],
  },
  {
    label: 'View',
    submenu: [
      { label: 'Command Palette', action: () => console.log('Command Palette') },
      { label: 'Toggle Sidebar', action: () => console.log('Toggle Sidebar') },
      { label: 'Toggle Theme', action: () => console.log('Toggle Theme') },
    ],
  },
  {
    label: 'Go',
    submenu: [
      { label: 'Go to File', action: () => console.log('Go to File') },
      { label: 'Go to Symbol', action: () => console.log('Go to Symbol') },
    ],
  },
  {
    label: 'Help',
    submenu: [
      { label: 'Documentation', action: () => console.log('Documentation') },
      { label: 'Keyboard Shortcuts', action: () => console.log('Keyboard Shortcuts') },
      { label: 'About', action: () => console.log('About') },
    ],
  },
];

export function DesktopTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const desktopApi = getDesktopApi();

  useEffect(() => {
    if (!isDesktopApp() || !desktopApi) {
      return;
    }

    // Get initial maximize state
    desktopApi.windowIsMaximized().then(setIsMaximized);

    // Listen for maximize state changes
    const unsubscribe = desktopApi.onWindowMaximize(setIsMaximized);

    return unsubscribe;
  }, [desktopApi]);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = () => {
      setActiveMenu(null);
    };

    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  useEffect(() => {
    // Keyboard shortcuts for menu access (Alt+F, Alt+E, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;

      const keyMap: Record<string, string> = {
        f: 'File',
        e: 'Edit',
        v: 'View',
        g: 'Go',
        h: 'Help',
      };

      const menuLabel = keyMap[e.key.toLowerCase()];
      if (menuLabel) {
        e.preventDefault();
        setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
      }

      // Escape to close menu
      if (e.key === 'Escape' && activeMenu) {
        e.preventDefault();
        setActiveMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu]);

  if (!isDesktopApp() || !desktopApi) {
    return null;
  }

  const handleMinimize = () => {
    desktopApi.windowMinimize();
  };

  const handleMaximize = () => {
    desktopApi.windowMaximize();
  };

  const handleClose = () => {
    desktopApi.windowClose();
  };

  const handleMenuClick = (e: React.MouseEvent, menuLabel: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    item.action?.();
    setActiveMenu(null);
  };

  return (
    <div
      data-desktop-title-bar
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex h-10 items-center justify-between',
        'bg-background border-b border-border',
        'select-none drag-region',
        'backdrop-blur-sm',
      )}
      style={
        {
          WebkitAppRegion: 'drag',
          WebkitUserSelect: 'none',
        } as React.CSSProperties
      }
    >
      {/* Left: App Branding & Menu Bar */}
      <div
        className="flex items-center h-full no-drag-region"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* App Logo/Title */}
        <div className="flex items-center gap-2 px-3 h-full border-r border-border">
          <LogoImage width={24} className="h-6 w-6" />
        </div>

        {/* Menu Bar */}
        <div className="flex items-center h-full">
          {menuItems.map((menu) => (
            <div key={menu.label} className="relative">
              <button
                onClick={(e) => handleMenuClick(e, menu.label)}
                className={cn(
                  'px-3 h-10 flex items-center gap-1',
                  'text-xs text-muted-foreground hover:text-foreground',
                  'hover:bg-accent',
                  'transition-colors duration-100',
                  'focus:outline-none',
                  activeMenu === menu.label && 'bg-accent text-foreground',
                )}
              >
                {menu.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {/* Dropdown Menu */}
              {activeMenu === menu.label && menu.submenu && (
                <div
                  className="absolute top-full left-0 mt-0.5 min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-popover border border-border rounded-md shadow-xl overflow-hidden">
                    {menu.submenu.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleMenuItemClick(item)}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-xs text-popover-foreground',
                          'hover:bg-accent hover:text-accent-foreground',
                          'transition-colors duration-75',
                          'focus:outline-none focus:bg-accent',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Window Controls */}
      <div
        className="flex items-center no-drag-region"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className={cn(
            'flex h-10 w-12 items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'transition-colors duration-150',
            'focus:outline-none',
          )}
          aria-label="Minimize"
        >
          <Minus className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          onClick={handleMaximize}
          className={cn(
            'flex h-10 w-12 items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'transition-colors duration-150',
            'focus:outline-none',
          )}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Square className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <Maximize2 className="h-3 w-3" strokeWidth={2.5} />
          )}
        </button>
        <button
          onClick={handleClose}
          className={cn(
            'flex h-10 w-12 items-center justify-center',
            'text-muted-foreground hover:text-white hover:bg-destructive',
            'transition-colors duration-150',
            'focus:outline-none',
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

