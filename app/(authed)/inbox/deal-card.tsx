'use client';

import { useEffect, useState } from 'react';
import { fetchBrief, type DealBrief } from '@/lib/inbox-api';
import {
  blockerLabel,
  Chip,
  cx,
  KIND_LABEL,
  LEVEL_LABEL,
  relativeTime,
  StageChip,
  TempDot,
} from '@/components/ui';

/**
 * Card de Bordo do RTV — contexto em segundos, antes de ler o histórico.
 * Recolhível (mobile). Atualiza quando chega mensagem nova (refreshKey).
 */
export function DealCardBoard({
  conversationId,
  refreshKey,
}: {
  conversationId: string;
  refreshKey: number;
}) {
  const [brief, setBrief] = useState<DealBrief | null | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const load = () =>
      fetchBrief(conversationId)
        .then(setBrief)
        .catch(() => setBrief((prev) => prev ?? null));
    load();
    // A análise do worker chega segundos depois da mensagem: repolling curto.
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [conversationId, refreshKey]);

  if (brief === undefined) return null;
  if (brief === null) {
    return (
      <div className="border-b border-border bg-surface-2/60 px-4 py-2 text-xs text-faint">
        A IA ainda não analisou esta conversa — o Card de Bordo aparece após a primeira
        mensagem do produtor.
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-surface-2/60">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left"
        aria-expanded={!collapsed}
      >
        <TempDot temperature={brief.temperature} withLabel />
        <StageChip stage={brief.stage} />
        {brief.blockerSubtype && <Chip tone="warning">{blockerLabel(brief.blockerSubtype)}</Chip>}
        <span className="ml-auto text-[11px] text-faint">
          IA · {relativeTime(brief.updatedAt)} {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {!collapsed && (
        <div className="grid gap-3 px-4 pb-3 md:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-2 text-[13px]">
            <p>
              <span className="font-semibold text-muted">Resumo: </span>
              {brief.contextSummary}
            </p>
            {brief.painPoint && (
              <p>
                <span className="font-semibold text-muted">Dor: </span>
                {brief.painPoint}
              </p>
            )}
            <p className="text-xs text-muted">
              intenção{' '}
              <span className={cx(brief.intent === 'ALTA' && 'text-accent')}>
                {LEVEL_LABEL[brief.intent]}
              </span>{' '}
              · urgência{' '}
              <span className={cx(brief.urgency === 'ALTA' && 'text-warning')}>
                {LEVEL_LABEL[brief.urgency]}
              </span>
              {brief.products.length > 0 && <> · {brief.products.join(', ')}</>}
            </p>
          </div>
          <div className="rounded-card border border-accent/40 bg-accent/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
              Próximo passo
              <Chip tone="accent">{KIND_LABEL[brief.nextActionKind] ?? brief.nextActionKind}</Chip>
              {brief.nextActionDueAt && (
                <span className="font-normal normal-case tracking-normal text-muted">
                  até {new Date(brief.nextActionDueAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug">{brief.nextAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}
