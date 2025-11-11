import { useMemo } from 'react';

export function useCsrfToken() {
  return useMemo(() => {
    if (typeof document === 'undefined') {
      return '';
    }

    const meta = document.querySelector(`meta[name="csrf-token"]`);

    return meta ? (meta.getAttribute('content') ?? '') : '';
  }, []);
}
