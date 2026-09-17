'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, storeTokens } from '@/lib/api';
import { BrandMark, Icon } from '@/components/ui';

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
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark inverted className="size-11" />
          <span className="font-display text-[28px] leading-none tracking-[-0.04em]">Farm</span>
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="eyebrow mb-5 !text-white/70">Convite da revenda</p>
          <h1 className="font-display text-[clamp(2.2rem,4.2vw,4rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            Sua carteira, com a mesma clareza do time.
          </h1>
          <p className="mt-7 max-w-md text-[17px] leading-relaxed text-white/70">
            O Farm transforma conversas em contexto e próximo passo — sem formulário extra.
          </p>
        </div>
        <p className="relative z-10 font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
          Sua carteira continua sendo sua
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-form">
          <div className="mb-8 md:hidden"><BrandMark /></div>
          <p className="eyebrow mb-2">Convite da revenda</p>
          <h2 className="font-display text-[2.2rem] font-bold leading-none tracking-[-0.04em]">Crie seu acesso</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
          {tokenFromLink
            ? 'Defina seu nome e senha para aceitar o convite.'
            : 'Cole o link ou o token do convite e defina a senha.'}
          </p>
          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
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
            {error && <p className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">{error}</p>}
            <button className="btn mt-1 w-full" type="submit" disabled={busy || !token.trim()}>
              {busy ? 'Criando acesso…' : 'Entrar para o time'}
              {!busy && <Icon name="arrow" />}
            </button>
          </form>
          <p className="mt-7 text-center text-xs text-faint">Ao continuar, você entra no ambiente privado da sua revenda.</p>
        </div>
      </section>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center"><p className="muted">Preparando convite…</p></main>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
