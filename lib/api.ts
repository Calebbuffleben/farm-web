/**
 * Cliente HTTP do farm/web contra o farm/backend.
 *
 * Tokens em localStorage (accessToken curto + refreshToken rotativo).
 * Em 401, tenta UM refresh e repete a chamada; se falhar, desloga.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? 'https://farm-backend-production-7bc0.up.railway.app';

const ACCESS_KEY = 'farm_access_token';
const REFRESH_KEY = 'farm_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken =
    typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_KEY) : null;
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const body = await res.json();
  storeTokens(body.accessToken, body.refreshToken);
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, init);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawRequest(path, init);
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join('; ') : body.message ?? message;
    } catch {
      // corpo não-JSON — mantém statusText
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart (CSV, áudio): sem Content-Type manual — o browser define o boundary. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const doFetch = () => {
    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${BASE_URL}${path}`, { method: 'POST', body: form, headers });
  };
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) {
    res = await doFetch();
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join('; ') : body.message ?? message;
    } catch {
      // corpo não-JSON
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Baixa mídia autenticada e devolve um object URL para <audio>/<img>. */
export async function fetchMediaUrl(assetId: string): Promise<string> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res = await fetch(`${BASE_URL}/inbox/media/${assetId}`, { headers });
  if (res.status === 401 && (await tryRefresh())) {
    const retryHeaders = new Headers();
    const fresh = getAccessToken();
    if (fresh) retryHeaders.set('Authorization', `Bearer ${fresh}`);
    res = await fetch(`${BASE_URL}/inbox/media/${assetId}`, { headers: retryHeaders });
  }
  if (!res.ok) throw new ApiError(res.status, 'Falha ao carregar mídia');
  return URL.createObjectURL(await res.blob());
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string, tenantSlug?: string) {
  const body = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(tenantSlug ? { tenantSlug } : {}) }),
  });
  storeTokens(body.accessToken, body.refreshToken);
  return body;
}

export interface Me {
  user: { id: string; email: string; name: string | null };
  membership: { id: string; role: string };
  tenant: { id: string; slug: string; name: string };
}

export function fetchMe() {
  return api<Me>('/auth/me');
}

export async function logout() {
  const refreshToken =
    typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_KEY) : null;
  try {
    await api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } finally {
    clearTokens();
  }
}
