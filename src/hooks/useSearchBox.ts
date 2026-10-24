import { useEffect, useState } from 'react';
import { useDebounced } from './useDebounced';

/** Local search input state, debounced into the URL-backed table state. */
export function useSearchBox(current: string | undefined, apply: (q: string) => void) {
  const [value, setValue] = useState(current ?? '');
  const debounced = useDebounced(value, 300);
  useEffect(() => {
    if ((current ?? '') !== debounced) apply(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return [value, setValue] as const;
}
