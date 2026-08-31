'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password, tenantSlug || undefined);
      router.replace('/dashboard');
    } catch (err) {
                  if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('E-mail ou senha inválidos.');
        } else if (err.status === 400 && /tenantSlug/i.test(err.message)) {
          setError('Você pertence a mais de uma empresa. Informe o slug.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Não foi possível conectar ao servidor.');
      }
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
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Farm</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
          Inteligência comercial da revenda
        </p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tenant">
              Empresa (opcional — se você pertence a mais de uma)
            </label>
            <input
              id="tenant"
              className="input"
              type="text"
              placeholder="slug-da-revenda"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
