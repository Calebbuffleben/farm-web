'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { MeProvider, useMe } from '@/lib/me-context';
import { homeForRole, peekRole, rememberHomeFromPath } from '@/lib/auth-session';
import { BrandMark, cx, Icon, type IconName } from '@/components/ui';
import { useEffect } from 'react';

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
  return (
    <MeProvider>
      <AuthedShell>{children}</AuthedShell>
    </MeProvider>
  );
}

function AuthedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const role = me?.membership.role ?? peekRole();
  const homeHref = homeForRole(role);

  useEffect(() => {
    rememberHomeFromPath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (role === 'MEMBER' && pathname.startsWith('/dashboard')) {
      router.replace('/inbox');
    }
  }, [role, pathname, router]);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  const navItems = role === 'MEMBER' ? NAV.filter((item) => item.href !== '/dashboard') : NAV;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="app-rail fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col p-5 md:flex">
        <Link href={homeHref} className="flex items-center gap-3 px-1 py-1">
          <BrandMark inverted />
          <div>
            <div className="font-display text-[22px] font-semibold leading-none tracking-[-0.03em] text-text">Farm</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Intelligence
            </div>
          </div>
        </Link>

        <div className="mx-1 mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
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
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition',
                  active
                    ? 'bg-[#eef4ff] text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eef4ff] text-[11px] font-bold uppercase tracking-wide text-accent">
              {me ? (me.user.name ?? me.user.email).slice(0, 2) : '—'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-text">
                {me ? (me.user.name ?? me.user.email) : '…'}
              </div>
              <div className="truncate text-[11px] text-muted">
                {role ? (ROLE_LABEL[role] ?? role) : '…'}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
              title="Sair"
              aria-label="Sair"
            >
              <Icon name="logout" />
            </button>
          </div>
          <div className="mt-3 truncate px-1 text-[11px] uppercase tracking-[0.12em] text-faint">
            {me?.tenant.name ?? ''}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top,0px))] items-center border-b border-border bg-bg/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md md:hidden">
        <Link href={homeHref} className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="font-display text-lg tracking-tight">Farm</span>
        </Link>
        {me && <span className="ml-auto max-w-[45%] truncate text-xs text-muted">{me.tenant.name}</span>}
      </header>

      <main className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:col-start-2 md:pb-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-10 md:py-10">
          {children}
        </div>
      </main>

      <nav
        className={cx(
          'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-50 grid rounded-2xl border border-border bg-surface/95 p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden',
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
