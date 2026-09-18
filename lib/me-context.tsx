'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, fetchMe, getAccessToken, type Me } from './api';
import { homeForRole, setLastHome } from './auth-session';

const MeContext = createContext<Me | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then((session) => {
        setMe(session);
        setLastHome(homeForRole(session.membership.role));
      })
      .catch(() => {
        clearTokens();
        router.replace('/login');
      });
  }, [router]);

  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMe(): Me | null {
  return useContext(MeContext);
}
