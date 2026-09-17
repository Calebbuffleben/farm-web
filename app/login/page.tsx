'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, fetchMe, login } from '@/lib/api';
import { BrandMark, Icon } from '@/components/ui';

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
      const me = await fetchMe();
      router.replace(me.membership.role === 'MEMBER' ? '/inbox' : '/dashboard');
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
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark inverted className="size-11" />
          <div>
            <div className="font-display text-[28px] leading-none tracking-[-0.04em]">Farm</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Intelligence</div>
          </div>
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="eyebrow mb-6 !text-white/70">Inteligência que nasce das conversas</div>
          <h1 className="font-display text-[clamp(2.4rem,4.6vw,4.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Sua operação comercial, em foco.
          </h1>
          <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-white/70">
            Saiba onde agir, quem apoiar e quais negócios estão mudando — sem pedir mais uma planilha ao time.
          </p>
        </div>
        <p className="relative z-10 font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
          Decisões melhores. Relacionamentos mais fortes.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-form">
          <div className="mb-9 md:hidden">
            <BrandMark />
          </div>
          <p className="eyebrow mb-2">Acesso seguro</p>
          <h2 className="font-display text-[2.05rem] font-semibold leading-none tracking-[-0.03em]">Bem-vindo de volta</h2>
          <p className="mt-2 text-sm text-muted">Entre para acompanhar sua operação comercial.</p>
          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
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
            {error && <p className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">{error}</p>}
            <button className="btn mt-1 w-full" type="submit" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar na plataforma'}
              {!busy && <Icon name="arrow" />}
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-faint">
            Ambiente protegido e isolado para sua revenda.
          </p>
        </div>
      </section>
    </main>
  );
}
