'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, getAccessToken } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then((me) => router.replace(me.membership.role === 'MEMBER' ? '/inbox' : '/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center">
      <p className="text-sm text-muted">Preparando seu ambiente…</p>
    </main>
  );
}
