import { getAccessToken } from './api';

const LAST_HOME_KEY = 'farm_last_home';

export type HomePath = '/dashboard' | '/inbox';

/** Lê `role` do access JWT sem verificar a assinatura — o backend autentica. */
export function peekRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

export function homeForRole(role: string | null | undefined): HomePath {
  return role === 'MEMBER' ? '/inbox' : '/dashboard';
}

export function getLastHome(): HomePath | null {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(LAST_HOME_KEY);
  if (value === '/inbox' || value === '/dashboard') return value;
  return null;
}

export function setLastHome(path: HomePath) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LAST_HOME_KEY, path);
}

export function rememberHomeFromPath(pathname: string) {
  if (pathname.startsWith('/inbox')) setLastHome('/inbox');
  else if (pathname.startsWith('/dashboard')) setLastHome('/dashboard');
}

export function resolveHomePath(): HomePath {
  return getLastHome() ?? homeForRole(peekRole());
}
