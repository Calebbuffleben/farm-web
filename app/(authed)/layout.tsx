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
    <div className="min-h-dvh md:grid md:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="app-rail fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col p-5 md:flex">
        <Link href={me?.membership.role === 'MEMBER' ? '/inbox' : '/dashboard'} className="flex items-center gap-3 px-1 py-1">
          <BrandMark inverted />
          <div>
            <div className="font-display text-[22px] leading-none tracking-[-0.04em] text-[#f4ecde]">Farm</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-copper">
              Caderno de bordo
            </div>
          </div>
        </Link>

        <div className="mx-1 mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ece6d8]/45">
          Espaço de trabalho
        </div>
        <nav className="mt-3 grid gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex items-center gap-3 px-3 py-2.5 text-[14px] font-semibold transition',
                  active
                    ? 'bg-[#f4ecde] text-ink'
                    : 'text-[#ece6d8]/72 hover:bg-white/5 hover:text-[#f4ecde]',
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="mx-3 mt-8 hidden text-[12px] leading-relaxed text-[#ece6d8]/40 xl:block">
          Leia a carteira como um jornal: o que está quente, o que esfria e o próximo passo.
        </p>

        {me && (
          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="flex items-center gap-2.5 px-1">
              <div className="grid size-9 shrink-0 place-items-center bg-copper/20 text-[11px] font-bold uppercase tracking-wide text-[#f4ecde]">
                {(me.user.name ?? me.user.email).slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#f4ecde]">
                  {me.user.name ?? me.user.email}
                </div>
                <div className="truncate text-[11px] text-[#ece6d8]/55">
                  {ROLE_LABEL[me.membership.role] ?? me.membership.role}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="ml-auto grid size-8 shrink-0 place-items-center text-[#ece6d8]/55 transition hover:bg-white/10 hover:text-[#f4ecde]"
                title="Sair"
                aria-label="Sair"
              >
                <Icon name="logout" />
              </button>
            </div>
            <div className="mt-3 truncate px-1 text-[11px] uppercase tracking-[0.12em] text-[#ece6d8]/40">
              {me.tenant.name}
            </div>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-paper/90 px-4 backdrop-blur-md md:hidden">
        <Link href={me?.membership.role === 'MEMBER' ? '/inbox' : '/dashboard'} className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="font-display text-lg tracking-tight">Farm</span>
        </Link>
        {me && <span className="ml-auto max-w-[45%] truncate text-xs text-muted">{me.tenant.name}</span>}
      </header>

      <main className="min-w-0 pb-24 md:col-start-2 md:pb-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-10 md:py-10">
          {children}
        </div>
      </main>

      <nav
        className={cx(
          'fixed inset-x-3 bottom-3 z-50 grid border border-border bg-paper/95 p-1.5 shadow-[0_16px_40px_rgba(26,23,18,0.14)] backdrop-blur-md md:hidden',
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
                'flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-semibold',
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
