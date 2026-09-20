'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchCheckoutSuccess } from '@/lib/inbox-api';
import { BrandMark } from '@/components/ui';
import { Suspense } from 'react';

function SuccessBody() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') ?? '';
  const [state, setState] = useState<{
    email: string;
    tenantSlug: string;
    plan: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Sessão de checkout ausente.');
      return;
    }
    fetchCheckoutSuccess(sessionId)
      .then(setState)
      .catch((err) => setError(err instanceof Error ? err.message : 'Checkout não encontrado'));
  }, [sessionId]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-content-center px-6 py-12">
      <div className="card">
        <BrandMark className="size-10" />
        <h1 className="mt-6 font-display text-3xl">Pagamento confirmado</h1>
        {error ? <p className="error mt-4 text-sm">{error}</p> : null}
        {state ? (
          <>
            <p className="mt-4 text-muted">
              A revenda <strong>{state.tenantSlug}</strong> está no plano {state.plan}.
              Entre com {state.email}.
            </p>
            <Link className="btn mt-6 inline-flex" href="/login">
              Ir para o login
            </Link>
          </>
        ) : !error ? (
          <p className="mt-4 text-sm text-muted">Confirmando o pagamento…</p>
        ) : null}
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <p className="text-sm text-muted">Carregando…</p>
        </main>
      }
    >
      <SuccessBody />
    </Suspense>
  );
}
