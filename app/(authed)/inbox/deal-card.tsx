'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchBrief, type BriefAnalysis, type DealBrief } from '@/lib/inbox-api';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import {
  blockerLabel,
  Chip,
  cx,
  Icon,
  KIND_LABEL,
  LEVEL_LABEL,
  relativeTime,
  StageChip,
  TempDot,
} from '@/components/ui';

/**
 * Card de Bordo do RTV — faixa compacta + detalhe rolável, para não tapar o chat.
 * Recolhido no mobile. Atualiza quando chega mensagem nova (refreshKey).
 */
export function DealCardBoard({
  conversationId,
  refreshKey,
  hasProducerMessage = false,
  className,
}: {
  conversationId: string;
  refreshKey: number;
  /** Já há IN no chat — não mente que está esperando a primeira mensagem. */
  hasProducerMessage?: boolean;
  className?: string;
}) {
  const [brief, setBrief] = useState<DealBrief | null>(null);
  const [analysis, setAnalysis] = useState<BriefAnalysis | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const pending = analysis === 'pending';

  useEffect(() => {
    setCollapsed(!window.matchMedia('(min-width: 768px)').matches);
  }, [conversationId]);

  const load = useCallback(() => {
    fetchBrief(conversationId)
      .then((r) => {
        setBrief(r.brief);
        if (r.analysis) {
          setAnalysis(r.analysis);
          return;
        }
        setAnalysis(r.brief ? 'ready' : hasProducerMessage ? 'pending' : 'waiting_producer');
      })
      .catch(() => undefined);
  }, [conversationId, hasProducerMessage, refreshKey]);

  useVisibleInterval(load, pending ? 4_000 : 15_000);

  if (analysis === null && !hasProducerMessage) return null;
  if (!brief) {
    const copy =
      analysis === 'blocked'
        ? 'Análise bloqueada pelo consentimento deste produtor.'
        : hasProducerMessage || analysis === 'pending'
          ? 'Mensagem recebida. Estamos atualizando o resumo e os próximos passos.'
          : 'Aguardando a primeira mensagem do produtor para montar o Card de Bordo.';
    return (
      <div className={cx('flex shrink-0 items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-2.5 text-xs text-faint', className)}>
        <Icon name="spark" className="size-3.5" />
        {copy}
      </div>
    );
  }

  return (
    <div className={cx('flex min-h-0 flex-col overflow-hidden border-b border-border bg-[#f5f8ff]', className)}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full min-w-0 shrink-0 flex-col gap-1 px-4 py-2.5 text-left sm:flex-row sm:items-center sm:gap-2"
        aria-expanded={!collapsed}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-copper">
            <Icon name="spark" className="size-3.5" />
            Resumo IA
          </span>
          <TempDot temperature={brief.temperature} withLabel />
          <StageChip stage={brief.stage} />
          {brief.blockerSubtype && <Chip tone="warning">{blockerLabel(brief.blockerSubtype)}</Chip>}
        </span>
        <span className="min-w-0 truncate text-[13px] text-muted sm:flex-1">
          <span className="font-medium text-copper">
            {KIND_LABEL[brief.nextActionKind] ?? 'Próximo'}:
          </span>{' '}
          {brief.nextAction}
        </span>
        <span className="shrink-0 text-[11px] text-faint sm:ml-auto">
          IA · {relativeTime(brief.updatedAt)} {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {!collapsed && (
        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-3 px-4 pb-3 md:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-2 text-[13px]">
              {brief.analysisQuality !== 'COMPLETE' && (
                <p className="rounded-control border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs text-warning">
                  {brief.analysisQuality === 'STALE'
                    ? 'Brief anterior preservado: a análise da última mensagem não foi concluída.'
                    : 'Análise parcial: use a mensagem destacada como base e revise antes de responder.'}
                </p>
              )}
              <p>
                <span className="font-semibold text-muted">Situação: </span>
                {brief.contextSummary}
              </p>
              {brief.producerPosition && (
                <p>
                  <span className="font-semibold text-muted">Posição do produtor: </span>
                  {brief.producerPosition}
                </p>
              )}
              {brief.dealChange && (
                <p>
                  <span className="font-semibold text-muted">Mudou agora: </span>
                  {brief.dealChange}
                </p>
              )}
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
            <div className="rounded-card border border-accent/25 bg-accent/10 p-3.5">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                Próximo passo
                <Chip tone="accent">{KIND_LABEL[brief.nextActionKind] ?? brief.nextActionKind}</Chip>
                {brief.nextActionDueAt && (
                  <span className="font-normal normal-case tracking-normal text-muted">
                    até {new Date(brief.nextActionDueAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {!brief.nextActionDueAt && brief.nextActionDueHint && (
                  <span className="font-normal normal-case tracking-normal text-muted">
                    {brief.nextActionDueHint}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug">{brief.nextAction}</p>
              <p className="mt-1 text-xs text-muted">
                Responsável: {brief.nextActionOwner === 'MANAGER' ? 'gerente' : 'RTV'}
                {brief.nextActionReason ? ` · ${brief.nextActionReason}` : ''}
              </p>
              {brief.managerGuidance && (
                <p className="mt-2 rounded-control border border-warning/30 bg-warning/10 p-2 text-xs">
                  <span className="font-semibold">Apoio do gerente: </span>
                  {brief.managerGuidance}
                </p>
              )}
              {brief.suggestedReply && brief.analysisQuality === 'COMPLETE' && (
                <div className="mt-2 border-t border-accent/20 pt-2">
                  <p className="text-xs text-muted">Resposta sugerida: “{brief.suggestedReply}”</p>
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-copper hover:underline"
                    onClick={() => void navigator.clipboard?.writeText(brief.suggestedReply ?? '')}
                  >
                    Copiar resposta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
