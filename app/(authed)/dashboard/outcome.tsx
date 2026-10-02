'use client';

import { useState } from 'react';
import {
  decideIntervention,
  fetchIntervention,
  type DashboardHome,
  type InterventionDecision,
  type InterventionTimeline,
  type InterventionTrigger,
  type OutcomeCard,
} from '@/lib/dashboard-api';
import {
  Chip,
  Empty,
  SectionHeader,
  STAGE_LABEL,
  StageChip,
  Stat,
  TEMP_LABEL,
  TempDot,
  blockerLabel,
  relativeTime,
} from '@/components/ui';

const TRIGGER_LABEL: Record<InterventionTrigger, string> = {
  MANAGER_OWNER: 'decisão do gerente',
  ESCALATE: 'escalar ao gestor',
  COOLING_CLOSE: 'esfriando no fechamento',
  PRICE_OVER_AUTHORITY: 'desconto acima da alçada',
  COMPETITOR_LATE: 'concorrente na reta quente',
};

type BucketKey = 'asked' | 'decided' | 'observed' | 'moved' | 'expired';

const BUCKETS: { key: BucketKey; label: string; hint: string; tone: 'accent' | 'neutral' | 'hot' | 'cooling' | 'danger' }[] = [
  { key: 'asked', label: 'Pediu intervenção', hint: 'alertas abertos na janela', tone: 'accent' },
  { key: 'decided', label: 'Assumidas ou delegadas', hint: 'decisão registrada', tone: 'neutral' },
  { key: 'observed', label: 'Ação no canal', hint: 'mensagem, ligação ou e-mail depois da decisão', tone: 'hot' },
  { key: 'moved', label: 'Movimentaram depois', hint: 'mudança observada após a ação', tone: 'accent' },
  { key: 'expired', label: 'Vencidas sem ação', hint: 'prazo passou e o canal não mostrou execução', tone: 'danger' },
];

export function OutcomePanel({
  home,
  onOpenDeal,
  onChanged,
}: {
  home: DashboardHome;
  onOpenDeal: (conversationId: string) => void;
  onChanged: () => void;
}) {
  const outcome = home.outcome;
  const [bucket, setBucket] = useState<BucketKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const board = outcome.scoreboard;
  const selected = bucket ? board[bucket] : null;
  const confidence = outcome.confidence;

  return (
    <section className="reveal">
      <SectionHeader
        title="Resultado da janela"
        subtitle="O que pediu a sua decisão, o que foi tratado e o que se movimentou depois. Movimento não é venda atribuída."
      />
      {outcome.since && <SinceStrip since={outcome.since} />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map((item) => (
          <Stat
            key={item.key}
            label={item.label}
            value={board[item.key].count}
            hint={item.hint}
            tone={item.tone}
            active={bucket === item.key}
            onClick={() => setBucket((current) => (current === item.key ? null : item.key))}
          />
        ))}
        <Stat
          label="Tempo até a ação"
          value={reactionLabel(board.medianReactionHours)}
          hint="mediana entre o alerta e a ação observada no canal"
          tone="cooling"
        />
      </div>
      {board.partialInMoved > 0 && (
        <p className="mt-3 text-xs text-warning">
          {board.partialInMoved} movimentação{board.partialInMoved === 1 ? '' : 'ões'} com análise parcial.
          Confirme a conversa antes de tratar como resultado.
        </p>
      )}
      <p className="mt-3 text-xs text-faint">
        {countLabel(confidence.stale, 'análise antiga fora da fila', 'análises antigas fora da fila')}
        {' · '}
        {countLabel(confidence.partial, 'análise parcial na fila', 'análises parciais na fila')}
        {' · '}
        {countLabel(
          confidence.unknownPending,
          'vínculo de fazenda pendente na revenda',
          'vínculos de fazenda pendentes na revenda',
        )}
      </p>
      {error && <p className="error mt-3">{error}</p>}
      {selected && (
        <div className="mt-4">
          {selected.items.length === 0 ? (
            <Empty title="Nenhum negócio neste número." />
          ) : (
            <ul className="grid gap-2">
              {selected.items.map((item) => (
                <DecisionCard
                  key={item.id}
                  item={item}
                  onOpenDeal={onOpenDeal}
                  onChanged={onChanged}
                  onError={setError}
                />
              ))}
              {selected.count > selected.items.length && (
                <li className="text-center text-[11px] text-faint">
                  +{selected.count - selected.items.length} além dos primeiros {selected.items.length}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8">
        <SectionHeader
          title="Decisões do gerente"
          subtitle="Só o que depende de você: assumir, delegar ao RTV ou não agir."
        />
        {outcome.queue.length === 0 ? (
          <Empty
            title="Nenhuma decisão sua em aberto."
            hint="Entra aqui desconto acima da alçada, fechamento esfriando, concorrente na reta quente ou pedido explícito de gestor."
          />
        ) : (
          <ul className="grid gap-2">
            {outcome.queue.map((item) => (
              <DecisionCard
                key={item.id}
                item={item}
                onOpenDeal={onOpenDeal}
                onChanged={onChanged}
                onError={setError}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SinceStrip({ since }: { since: NonNullable<DashboardHome['outcome']['since']> }) {
  const bits = [
    since.newDecisions ? `${since.newDecisions} alerta${since.newDecisions === 1 ? '' : 's'} novo${since.newDecisions === 1 ? '' : 's'}` : null,
    since.advanced ? `${since.advanced} negócio${since.advanced === 1 ? '' : 's'} avançou` : null,
    since.cooled ? `${since.cooled} esfriou` : null,
    since.executed ? `${since.executed} ação observada` : null,
    since.expired ? `${since.expired} vencida${since.expired === 1 ? '' : 's'}` : null,
    since.threats ? `${since.threats} ameaça${since.threats === 1 ? '' : 's'} nova${since.threats === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return (
    <p className="mb-4 border border-border bg-surface px-4 py-3 text-sm text-muted">
      <span className="font-medium text-text">Desde a última leitura</span>
      {' · '}
      {new Date(since.from).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      {' · '}
      {bits.length ? bits.join(' · ') : 'nada novo no recorte'}
    </p>
  );
}

function DecisionCard({
  item,
  onOpenDeal,
  onChanged,
  onError,
}: {
  item: OutcomeCard;
  onOpenDeal: (conversationId: string) => void;
  onChanged: () => void;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [timeline, setTimeline] = useState<InterventionTimeline | null>(null);

  async function decide(decision: InterventionDecision) {
    setBusy(true);
    onError(null);
    try {
      await decideIntervention(item.id, decision);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao registrar a decisão');
    } finally {
      setBusy(false);
    }
  }

  async function toggleTimeline() {
    if (timeline) {
      setTimeline(null);
      return;
    }
    try {
      setTimeline(await fetchIntervention(item.id));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao carregar a linha do tempo');
    }
  }

  return (
    <li className="border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TempDot temperature={item.temperature} withLabel />
        <button className="text-sm font-semibold hover:text-accent" onClick={() => onOpenDeal(item.conversationId)}>
          {item.producerName ?? 'Produtor'}
        </button>
        {item.farmNames.length > 0 && <span className="text-xs text-muted">· {item.farmNames.join(', ')}</span>}
        <StageChip stage={item.stage} />
        <Chip tone="warning">{TRIGGER_LABEL[item.trigger]}</Chip>
        {item.uncertain && <Chip tone="neutral">análise parcial</Chip>}
        <span className="ml-auto text-[11px] text-faint">{statusLabel(item)}</span>
      </div>
      {item.managerGuidance && <p className="mt-2 text-sm">{item.managerGuidance}</p>}
      <p className="mt-1 text-[13px] text-muted">
        <span className="font-medium text-copper">Ação:</span> {item.recommendedAction}
        {' · '}
        {item.recommendedOwner === 'MANAGER' ? 'gerente' : 'RTV'}
        {item.dueAt ? ` · até ${new Date(item.dueAt).toLocaleDateString('pt-BR')}` : ''}
        {item.rtvName ? ` · RTV ${item.rtvName}` : ''}
        {' · '}aberto {relativeTime(item.createdAt)}
      </p>
      {item.blockerSubtype && (
        <p className="mt-1 text-xs text-muted">Gargalo: {blockerLabel(item.blockerSubtype)}</p>
      )}
      {item.moneyHints.length > 0 && (
        <p className="mt-1 text-xs text-faint">Pistas de valor: {item.moneyHints.join(' · ')}</p>
      )}
      {item.movement && (
        <p className="mt-2 text-[13px]">
          <span className="font-medium">{movementLabel(item.movement)}.</span>{' '}
          <span className="text-muted">{item.movementNote}</span>
        </p>
      )}
      {item.executionObservedAt && (
        <p className="mt-1 text-xs text-muted">
          Ação observada {item.executionChannel ? `em ${channelLabel(item.executionChannel)} ` : ''}
          {relativeTime(item.executionObservedAt)}
          {item.producerRepliedAt ? ' · produtor respondeu depois' : ' · produtor ainda sem resposta'}
        </p>
      )}
      {item.status === 'ACKNOWLEDGED' && !item.executionObservedAt && (
        <p className="mt-1 text-xs text-faint">Ação ainda não observada no canal. Fora dele, não conta como não feita.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => onOpenDeal(item.conversationId)}>
          Abrir negócio
        </button>
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => void toggleTimeline()}>
          {timeline ? 'Fechar linha do tempo' : 'Linha do tempo'}
        </button>
        {item.status === 'OPEN' && (
          <>
            <button className="btn !py-1.5 text-xs" disabled={busy} onClick={() => void decide('ASSUME')}>
              Assumir
            </button>
            <button
              className="btn-ghost !py-1.5 text-xs"
              disabled={busy || !item.canDelegate}
              title={item.canDelegate ? undefined : 'Sem RTV nesta conversa'}
              onClick={() => void decide('DELEGATE')}
            >
              Delegar ao RTV
            </button>
            <button className="btn-ghost !py-1.5 text-xs" disabled={busy} onClick={() => void decide('DISMISS')}>
              Não agir
            </button>
          </>
        )}
      </div>
      {timeline && (
        <ol className="mt-3 grid gap-2 border-t border-border pt-3">
          {timeline.timeline.map((point) => (
            <li key={`${point.at}-${point.label}`} className="text-[13px]">
              <span className="text-faint">{new Date(point.at).toLocaleString('pt-BR')} · </span>
              {point.label}: {STAGE_LABEL[point.stage]} · {TEMP_LABEL[point.temperature]}
              {point.blockerSubtype ? ` · ${blockerLabel(point.blockerSubtype)}` : ''}
            </li>
          ))}
          {timeline.movementNote && (
            <li className="text-[13px] text-muted">Observação: {timeline.movementNote}</li>
          )}
        </ol>
      )}
    </li>
  );
}

function statusLabel(item: OutcomeCard): string {
  if (item.status === 'OPEN') return 'aguardando decisão';
  if (item.status === 'ACKNOWLEDGED' && item.decision === 'ASSUME') return 'assumida';
  if (item.status === 'ACKNOWLEDGED' && item.decision === 'DELEGATE') return 'delegada ao RTV';
  if (item.status === 'EXECUTED') return 'ação observada';
  if (item.status === 'DISMISSED') return 'sem ação';
  if (item.status === 'EXPIRED') return 'prazo vencido sem ação observada';
  return item.status;
}

function movementLabel(movement: NonNullable<OutcomeCard['movement']>): string {
  if (movement === 'FAVORABLE') return 'Movimentou após a intervenção';
  if (movement === 'UNFAVORABLE') return 'Movimento desfavorável';
  return 'Sem movimento observado';
}

function channelLabel(channel: string): string {
  if (channel === 'VOICE') return 'ligação';
  if (channel === 'EMAIL') return 'e-mail';
  return 'WhatsApp';
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function reactionLabel(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) return '< 1 h';
  return `${hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
}
