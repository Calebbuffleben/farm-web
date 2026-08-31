'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, storeTokens } from '@/lib/api';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/invites/accept-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(body.message) ? body.message.join('; ') : body.message;
        throw new ApiError(res.status, msg || res.statusText);
      }
      if (body.accessToken && body.refreshToken) {
        storeTokens(body.accessToken, body.refreshToken);
        router.replace('/inbox');
        return;
      }
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível aceitar o convite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Entrar no time</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
          Cole o token que o owner da revenda te enviou e defina a senha.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="label" htmlFor="token">Token do convite</label>
            <input
              id="token"
              className="input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha (mín. 12)</label>
            <input
              id="password"
              className="input"
              type="password"
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error" style={{ fontSize: 14 }}>{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Aceitar convite'}
          </button>
        </form>
      </div>
    </main>
  );
}
