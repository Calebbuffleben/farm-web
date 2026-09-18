'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, fetchMe, getAccessToken } from '@/lib/api';
import { resolveHomePath } from '@/lib/auth-session';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    router.replace(resolveHomePath());
    fetchMe().catch(() => {
      clearTokens();
      router.replace('/login');
    });
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center">
      <p className="text-sm text-muted">Preparando seu ambiente…</p>
    </main>
  );
}
