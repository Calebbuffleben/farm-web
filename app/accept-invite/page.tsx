'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, storeTokens } from '@/lib/api';

interface AcceptPublicResponse {
  accessToken?: string;
  refreshToken?: string;
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromLink = searchParams.get('token')?.trim() ?? '';
  const [token, setToken] = useState(tokenFromLink);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = await api<AcceptPublicResponse>('/invites/accept-public', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });
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
          {tokenFromLink
            ? 'Defina seu nome e senha para aceitar o convite.'
            : 'Cole o link ou o token do convite e defina a senha.'}
        </p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          {!tokenFromLink ? (
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
          ) : null}
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
          <button className="btn" type="submit" disabled={busy || !token.trim()}>
            {busy ? 'Entrando…' : 'Aceitar convite'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}><p className="muted">Carregando…</p></main>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
