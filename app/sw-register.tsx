'use client';

import { useEffect } from 'react';

/** Registra o service worker (instalabilidade do PWA). */
export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}
