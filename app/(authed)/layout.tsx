'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearTokens, fetchMe, getAccessToken, logout, type Me } from '@/lib/api';

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings', label: 'Configurações' },
];

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then(setMe)
      .catch(() => {
        clearTokens();
        router.replace('/login');
      })
      .finally(() => setChecking(false));
  }, [router]);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p className="muted">Carregando…</p>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <span style={{ fontWeight: 700 }}>Farm</span>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {me && (
            <span className="muted" style={{ fontSize: 13 }}>
              {me.user.email} · {me.tenant.name}
            </span>
          )}
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: 20, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
