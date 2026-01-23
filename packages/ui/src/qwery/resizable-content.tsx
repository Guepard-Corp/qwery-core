import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../shadcn/resizable';
import { cn } from '../lib/utils';

interface ResizableContentProps {
  Content: React.ReactElement | null;
  AgentSidebar: React.ReactElement | null;
  open?: boolean;
}

export interface ResizableContentRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const ResizableContent = forwardRef<
  ResizableContentRef,
  ResizableContentProps
>(function ResizableContent(props, ref) {
  const { Content, AgentSidebar, open: initialOpen = false } = props;
  const [isOpen, setIsOpen] = useState(initialOpen);

  // Expose imperative handle for external control
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModKeyPressed = isMac ? event.metaKey : event.ctrlKey;

      if (isModKeyPressed && event.key === 'l') {
        const target = event.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (!isInputFocused) {
          event.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // When open prop is true, always open (even if user had closed it)
    // This allows notebook prompts to force-open the sidebar
    // Use requestAnimationFrame to defer state updates outside of effect
    if (initialOpen === true) {
      requestAnimationFrame(() => {
        setIsOpen(true);
      });
    } else if (initialOpen === false) {
      // Only close if explicitly set to false (not just undefined)
      requestAnimationFrame(() => {
        setIsOpen(false);
      });
    }
    // If initialOpen is undefined, maintain current state (user-controlled)
  }, [initialOpen]);

  const sidebarSize = isOpen ? 50 : 0;
  const contentSize = isOpen ? 50 : 100;

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full overflow-hidden overflow-x-hidden"
    >
      <ResizablePanel
        defaultSize={contentSize}
        minSize={isOpen ? 50 : 100}
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden',
          AgentSidebar && 'border-border border-r',
        )}
      >
        <div className="h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden overflow-x-hidden">
          {Content}
        </div>
      </ResizablePanel>
      {/* Always render sidebar to keep it mounted, but hide when closed */}
      {AgentSidebar && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            key={isOpen ? 'sidebar-open' : 'sidebar-closed'}
            defaultSize={sidebarSize}
            minSize={isOpen ? 25 : 0}
            maxSize={isOpen ? 80 : 0}
            className={
              isOpen
                ? 'flex h-full min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden'
                : 'hidden'
            }
          >
            <div className="h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden overflow-x-hidden">
              {AgentSidebar}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
});
