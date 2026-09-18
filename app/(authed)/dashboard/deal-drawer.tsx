'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDeal, type DealDetail, type FactCard } from '@/lib/dashboard-api';
import {
  blockerLabel,
  Chip,
  Drawer,
  KIND_LABEL,
  LEVEL_LABEL,
  relativeTime,
  StageChip,
  TempDot,
} from '@/components/ui';

/**
 * Drawer do negócio — Resumo Executivo em 3 pilares (Contexto · Intenção/Urgência
 * · Dor), Next Best Action em destaque e fatos abertos com evidência.
 */
export function DealDrawer({
  conversationId,
  onClose,
  onOpenFact,
}: {
  conversationId: string;
  onClose: () => void;
  onOpenFact: (factId: string) => void;
}) {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDeal(null);
    setError(null);
    fetchDeal(conversationId)
      .then(setDeal)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar'));
  }, [conversationId]);

  const inboxHref = `/inbox?c=${encodeURIComponent(conversationId)}${
    deal ? `&m=${encodeURIComponent(deal.evidenceMessageId)}` : ''
  }`;

  return (
    <Drawer
      open
      onClose={onClose}
      width={620}
      title={
        deal ? (
          <div className="flex min-w-0 items-center gap-2">
            <TempDot temperature={deal.temperature} />
            <span className="truncate">{deal.producerName ?? deal.producerPhone ?? 'Produtor'}</span>
            <StageChip stage={deal.stage} />
          </div>
        ) : (
          'Negócio'
        )
      }
    >
      {error && <p className="error">{error}</p>}
      {!deal && !error && <p className="muted text-sm">Carregando…</p>}
      {deal && (
        <div className="grid gap-4">
          {deal.analysisQuality !== 'COMPLETE' && (
            <p className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              {deal.analysisQuality === 'STALE'
                ? 'A última análise falhou; este brief preserva a orientação anterior.'
                : 'Análise parcial. Valide a conversa antes de orientar o RTV.'}
            </p>
          )}
          <p className="text-[13px] text-muted">
            {[deal.farmNames.join(', ') || null, deal.rtvName ? `RTV ${deal.rtvName}` : null]
              .filter(Boolean)
              .join(' · ')}
            {' · '}último contato {relativeTime(deal.lastMessageAt)}
            {deal.unanswered && <span className="text-cooling"> · produtor sem resposta</span>}
          </p>

          {/* Next Best Action */}
          <section className="rounded-card border border-accent/25 bg-accent/10 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Próximo passo
              <Chip tone="accent">{KIND_LABEL[deal.nextActionKind] ?? deal.nextActionKind}</Chip>
              {deal.nextActionDueAt && (
                <span className="text-[11px] font-normal normal-case tracking-normal text-muted">
                  até {new Date(deal.nextActionDueAt).toLocaleDateString('pt-BR')}
                </span>
              )}
              {!deal.nextActionDueAt && deal.nextActionDueHint && (
                <span className="text-[11px] font-normal normal-case tracking-normal text-muted">
                  {deal.nextActionDueHint}
                </span>
              )}
            </div>
            <p className="text-[17px] font-medium leading-snug font-display tracking-[-0.02em]">{deal.nextAction}</p>
            <p className="mt-1.5 text-xs text-muted">
              Responsável: {deal.nextActionOwner === 'MANAGER' ? 'gerente' : 'RTV'}
              {deal.nextActionReason ? ` · ${deal.nextActionReason}` : ''}
            </p>
          </section>

          {/* 3 pilares */}
          <section className="grid gap-3 sm:grid-cols-3">
            <Pillar title="Situação">
              {deal.contextSummary}
              {deal.dealChange && (
                <p className="mt-2 text-xs text-accent">
                  <span className="font-semibold">Mudou agora:</span> {deal.dealChange}
                </p>
              )}
            </Pillar>
            <Pillar title="Intenção · Urgência">
              <div className="flex flex-wrap gap-1.5">
                <Chip tone={deal.intent === 'ALTA' ? 'accent' : 'neutral'}>
                  intenção {LEVEL_LABEL[deal.intent]}
                </Chip>
                <Chip tone={deal.urgency === 'ALTA' ? 'warning' : 'neutral'}>
                  urgência {LEVEL_LABEL[deal.urgency]}
                </Chip>
              </div>
              {deal.products.length > 0 && (
                <p className="mt-2 text-xs text-muted">{deal.products.join(', ')}</p>
              )}
            </Pillar>
            <Pillar title="Posição · Dor">
              {deal.producerPosition && <p className="mb-2">{deal.producerPosition}</p>}
              {deal.painPoint ?? <span className="text-faint">Nenhuma identificada</span>}
              {deal.blockerSubtype && (
                <div className="mt-2">
                  <Chip tone="warning">gargalo: {blockerLabel(deal.blockerSubtype)}</Chip>
                </div>
              )}
            </Pillar>
          </section>

          {deal.managerGuidance && (
            <section className="rounded-card border border-warning/40 bg-warning/10 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-warning">
                Intervenção do gerente
              </h3>
              <p className="mt-1 text-sm">{deal.managerGuidance}</p>
            </section>
          )}

          {deal.criticalFacts.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">
                Riscos críticos
              </h3>
              <ul className="list-disc pl-5 text-sm text-muted">
                {deal.criticalFacts.map((headline) => (
                  <li key={headline}>{headline}</li>
                ))}
              </ul>
            </section>
          )}

          {deal.suggestedReply && (
            <section className="rounded-card border border-border bg-surface-2 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Resposta sugerida ao RTV
              </h3>
              <p className="mt-1 text-sm">“{deal.suggestedReply}”</p>
            </section>
          )}

          {deal.moneyHints.length > 0 && (
            <p className="text-xs text-muted">
              Pistas de valor: {deal.moneyHints.join(' · ')}{' '}
              <span className="text-faint">— R$ apurado só com ERP</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href={inboxHref} className="btn">
              Abrir conversa
            </Link>
            <span className="self-center text-xs text-faint">
              brief atualizado {relativeTime(deal.updatedAt)} · confiança{' '}
              {Math.round(deal.stageConfidence * 100)}%
            </span>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold">
              Fatos abertos <span className="font-normal text-muted">({deal.facts.length})</span>
            </h3>
            {deal.facts.length === 0 ? (
              <p className="text-[13px] text-muted">Nenhum fato aberto nesta conversa.</p>
            ) : (
              <ul className="grid gap-2">
                {deal.facts.map((f) => (
                  <FactRow key={f.id} fact={f} onOpen={() => onOpenFact(f.id)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </div>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  );
}

export function FactRow({ fact, onOpen }: { fact: FactCard; onOpen: () => void }) {
  const tone =
    fact.severity === 'CRITICAL' ? 'danger' : fact.severity === 'WARNING' ? 'warning' : 'neutral';
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full rounded-control border border-border bg-surface-2 px-3 py-2.5 text-left transition hover:border-border-strong"
      >
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <Chip tone={tone}>{fact.kind}</Chip>
          <span>{fact.subtype}</span>
          {fact.farmName && <span>· {fact.farmName}</span>}
          {fact.moneyHint && <span>· {fact.moneyHint}</span>}
          {fact.confidence !== undefined && (
            <span>· IA {Math.round(fact.confidence * 100)}%</span>
          )}
          <span className="ml-auto">{relativeTime(fact.occurredAt)}</span>
        </div>
        <p className="mt-1 text-sm font-medium leading-snug">{fact.headline}</p>
        {fact.evidenceSpan && (
          <p className="mt-1 text-xs italic text-muted">“{fact.evidenceSpan}”</p>
        )}
      </button>
    </li>
  );
}
