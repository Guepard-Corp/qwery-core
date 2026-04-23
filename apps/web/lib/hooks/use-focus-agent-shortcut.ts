import { useCallback } from 'react';

export function useFocusAgentShortcut() {
  return useCallback(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'l',
        code: 'KeyL',
        [isMac ? 'metaKey' : 'ctrlKey']: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, []);
}
