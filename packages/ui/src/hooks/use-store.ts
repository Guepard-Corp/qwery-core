import { useState, useEffect } from 'react';

export function useStore<T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F,
): F | undefined {
  const result = store(callback) as F;
  const [data, setData] = useState<F | undefined>(undefined);

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
}
