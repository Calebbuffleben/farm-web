'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearTokens, fetchMe, getAccessToken, logout, type Me } from '@/lib/api';
import { BrandMark, cx, Icon, type IconName } from '@/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Visão executiva', shortLabel: 'Gestão', icon: 'dashboard' },
  { href: '/inbox', label: 'Conversas', shortLabel: 'Conversas', icon: 'inbox' },
  { href: '/settings', label: 'Configurações', shortLabel: 'Ajustes', icon: 'settings' },
] satisfies Array<{
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
}>;

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  MEMBER: 'RTV',
};

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

  const navItems =
    me?.membership.role === 'MEMBER'
      ? NAV.filter((item) => item.href !== '/dashboard')
      : NAV;

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="flex items-center gap-3 text-sm text-muted">
          <BrandMark className="size-10 animate-pulse" />
          Preparando sua visão…
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-surface/95 p-4 backdrop-blur md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-2">
          <BrandMark />
          <div>
            <div className="text-[15px] font-bold tracking-[-0.025em]">Farm</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Intelligence
            </div>
          </div>
        </Link>

        <div className="mx-2 mt-7 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
          Espaço de trabalho
        </div>
        <nav className="mt-2 grid gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition',
                  active
                    ? 'bg-accent text-accent-ink shadow-[0_4px_12px_rgba(22,101,52,0.16)]'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {me && (
          <div className="mt-auto rounded-[14px] border border-border bg-surface-2/70 p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
                {(me.user.name ?? me.user.email).slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">
                  {me.user.name ?? me.user.email}
                </div>
                <div className="truncate text-[11px] text-muted">
                  {ROLE_LABEL[me.membership.role] ?? me.membership.role}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-danger"
                title="Sair"
                aria-label="Sair"
              >
                <Icon name="logout" />
              </button>
            </div>
            <div className="mt-2 truncate border-t border-border pt-2 text-[11px] text-faint">
              {me.tenant.name}
            </div>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-surface/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="text-sm font-bold tracking-tight">Farm</span>
        </Link>
        {me && <span className="ml-auto max-w-[45%] truncate text-xs text-muted">{me.tenant.name}</span>}
      </header>

      <main className="min-w-0 pb-24 md:col-start-2 md:pb-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      <nav
        className={cx(
          'fixed inset-x-3 bottom-3 z-50 grid rounded-[18px] border border-border bg-surface/95 p-1.5 shadow-[0_12px_40px_rgba(20,36,25,0.16)] backdrop-blur-md md:hidden',
          navItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
        )}
      >
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-[13px] px-2 py-2 text-[10px] font-semibold',
                active ? 'bg-accent text-accent-ink' : 'text-muted',
              )}
            >
              <Icon name={item.icon} className="size-[18px]" />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
