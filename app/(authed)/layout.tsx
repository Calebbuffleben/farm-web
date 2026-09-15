'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearTokens, fetchMe, getAccessToken, logout, type Me } from '@/lib/api';
import { cx } from '@/components/ui';

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/dashboard', label: 'Centro de Comando' },
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
      <main className="flex min-h-dvh items-center justify-center">
        <p className="muted">Carregando…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-5 px-5 py-2.5">
          <Link href="/inbox" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">
              F
            </span>
            <span className="text-sm font-semibold tracking-tight">Farm</span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-surface-2 p-0.5">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'rounded-full px-3 py-1 text-[13px] font-medium transition',
                    active ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {me && (
              <span className="hidden text-[13px] text-muted sm:inline">
                <span className="text-text">{me.tenant.name}</span> · {me.user.email}
              </span>
            )}
            <button onClick={onLogout} className="btn-ghost !px-3 !py-1 text-[13px]">
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-5">{children}</main>
    </div>
  );
}
