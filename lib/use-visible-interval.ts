'use client';

import { useEffect } from 'react';

/** Roda `fn` na montagem e em intervalo, pulando ticks com a aba oculta. */
export function useVisibleInterval(fn: () => void, ms: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fn();
    };
    tick();
    const timer = setInterval(tick, ms);
    const onVisibility = () => {
      if (!document.hidden) fn();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fn, ms, enabled]);
}
