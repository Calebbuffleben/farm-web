'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import {
  createCheckoutSession,
  fetchBillingCatalog,
  type BillingCatalog,
} from '@/lib/inbox-api';
import { BrandMark } from '@/components/ui';

function formatBrl(cents: number | null) {
  if (cents == null) return 'Sob consulta';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

const FALLBACK: BillingCatalog = {
  currency: 'BRL',
  plans: [
    { id: 'STARTER', name: 'Starter', maxUsers: 3, priceCents: 49700, public: true, contact: false },
    { id: 'GROWTH', name: 'Growth', maxUsers: 10, priceCents: 129700, public: true, contact: false },
    { id: 'SCALE', name: 'Scale', maxUsers: 25, priceCents: 249700, public: true, contact: false },
    { id: 'ENTERPRISE', name: 'Enterprise', maxUsers: 25, priceCents: null, public: false, contact: true },
  ],
};

export default function PricingPage() {
  const [catalog, setCatalog] = useState<BillingCatalog>(FALLBACK);
  const [plan, setPlan] = useState('STARTER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enterpriseUrl =
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_URL || 'mailto:comercial@example.com';

  useEffect(() => {
    fetchBillingCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const selected = useMemo(
    () => catalog.plans.find((p) => p.id === plan) ?? catalog.plans[0],
    [catalog, plan],
  );

  function slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected?.public) return;
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckoutSession({
        email,
        password,
        name: name || undefined,
        tenantName,
        tenantSlug,
        plan: selected.id,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Não foi possível iniciar o checkout. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link href="/login" className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <div className="font-display text-2xl leading-none tracking-[-0.04em]">Flux</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
              Planos
            </div>
          </div>
        </Link>
        <Link href="/login" className="text-sm text-muted hover:text-text">
          Já tenho conta
        </Link>
      </div>

      <p className="eyebrow mb-3">Precificação por faixa</p>
      <h1 className="font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-[-0.03em]">
        Assentos com teto rígido. Mensalidade fixa.
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        Cada usuário ativo ou convite pendente ocupa um assento. O owner conta.
        Upgrade imediato; downgrade no próximo ciclo se a equipe couber no plano.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {catalog.plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (p.public) setPlan(p.id);
            }}
            className={`card text-left ${plan === p.id ? 'ring-2 ring-accent' : ''}`}
          >
            <p className="eyebrow">{p.name}</p>
            <p className="mt-2 font-display text-2xl">{formatBrl(p.priceCents)}</p>
            <p className="mt-2 text-sm text-muted">
              {p.contact ? 'Limite contratual' : `Até ${p.maxUsers} usuários`}
            </p>
            {p.contact ? (
              <a className="mt-4 inline-block text-sm text-accent" href={enterpriseUrl}>
                Falar com o comercial
              </a>
            ) : null}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card mt-10 grid max-w-xl gap-4">
        <h2 className="font-display text-xl">Criar revenda no {selected?.name}</h2>
        <label className="label">
          E-mail do owner
          <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="label">
          Senha (mín. 12 caracteres)
          <input
            className="input mt-1"
            type="password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="label">
          Seu nome
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="label">
          Nome da revenda
          <input
            className="input mt-1"
            required
            value={tenantName}
            onChange={(e) => {
              setTenantName(e.target.value);
              if (!slugTouched) setTenantSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label className="label">
          Slug
          <input
            className="input mt-1"
            required
            value={tenantSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setTenantSlug(e.target.value);
            }}
          />
        </label>
        {error ? <p className="error text-sm">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy || !selected?.public}>
          {busy ? 'Redirecionando…' : `Assinar ${selected?.name} no Stripe`}
        </button>
        <p className="text-xs text-faint">
          Você será enviado ao Stripe Checkout. Cartão apenas; o tenant só nasce depois do pagamento.
        </p>
      </form>
    </main>
  );
}
