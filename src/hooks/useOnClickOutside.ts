// src/hooks/useOnClickOutside.ts
import { useEffect, RefObject } from 'react';

type AnyEvent = MouseEvent | TouchEvent;

// O tipo RefObject agora aceita explicitamente um elemento que pode ser nulo.
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>, 
  handler: (event: AnyEvent) => void
) {
  useEffect(() => {
    const listener = (event: AnyEvent) => {
      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}