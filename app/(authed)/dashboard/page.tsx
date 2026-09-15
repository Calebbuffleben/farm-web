'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import {
  fetchDashboardHome,
  fetchFact,
  type AttentionItem,
  type AttentionReason,
  type DashboardHome,
  type DealCard,
  type FactDetail,
  type HomeQuery,
  type RadarRow,
} from '@/lib/dashboard-api';
import {
  blockerLabel,
  Card,
  Chip,
  cx,
  DataTable,
  Empty,
  KIND_LABEL,
  relativeTime,
  SectionHeader,
  Segmented,
  STAGE_LABEL,
  StageChip,
  Stat,
  TempBar,
  TempDot,
} from '@/components/ui';
import { DealDrawer } from './deal-drawer';
import { FactDrawer } from './fact-drawer';
import { Signals } from './signals';

const REASON_LABEL: Record<AttentionReason, string> = {
  hot_with_pain: 'quente com objeção',
  cooling_late_stage: 'esfriando na reta final',
  unanswered: 'produtor sem resposta',
  next_action_overdue: 'próximo passo vencido',
  followup_overdue: 'follow-up atrasado',
};

/**
 * Centro de Comando do gestor. Tudo aqui é leitura do que a IA já escreveu ao
 * analisar as conversas — o RTV não preencheu nada. R$ fica fora até ERP.
 */
export default function DashboardPage() {
  const [query, setQuery] = useState<HomeQuery>({ days: 7 });
  const [home, setHome] = useState<DashboardHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);
  const [fact, setFact] = useState<FactDetail | null>(null);

  const refresh = useCallback(() => {
    fetchDashboardHome(query)
      .then((data) => {
        setHome(data);
        setError(null);
        setForbidden(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(err instanceof Error ? err.message : 'Falha ao carregar');
      });
  }, [query]);

  useEffect(refresh, [refresh]);

  const openFact = (id: string) => {
    fetchFact(id).then(setFact).catch(() => undefined);
  };

  if (forbidden) {
    return (
      <p className="muted">
        O Centro de Comando é para o gestor (OWNER, ADMIN ou MANAGER). O RTV usa o Inbox.
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Comando</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Onde cada cliente está e o que fazer para vender mais — escrito pela IA a partir
            das conversas, sem o RTV preencher nada.
          </p>
        </div>
        {home && (
          <Filters
            home={home}
            query={query}
            onChange={(next) => {
              setQuery(next);
              setDealId(null);
              setFact(null);
            }}
          />
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {!home && !error && <p className="muted">Carregando…</p>}

      {home && (
        <>
          <Today home={home} onOpenDeal={setDealId} />
          <Radar
            rows={home.radar}
            activeRtv={query.rtvUserId}
            onPick={(id) =>
              setQuery({ ...query, rtvUserId: query.rtvUserId === id ? undefined : id ?? undefined })
            }
          />
          <PipelineSection home={home} onOpenDeal={setDealId} />
          <Signals home={home} onOpenFact={openFact} />
          {home.unknownPending > 0 && (
            <p className="text-sm">
              <Link href="/settings" className="text-accent">
                {home.unknownPending} trecho{home.unknownPending === 1 ? '' : 's'} na fila unknown
              </Link>
              <span className="muted"> — vínculo humano, o LLM não chuta.</span>
            </p>
          )}
        </>
      )}

      {dealId && !fact && (
        <DealDrawer conversationId={dealId} onClose={() => setDealId(null)} onOpenFact={openFact} />
      )}
      {fact && (
        <FactDrawer
          key={fact.id}
          detail={fact}
          onClose={() => setFact(null)}
          onChanged={() => {
            setFact(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Today({
  home,
  onOpenDeal,
}: {
  home: DashboardHome;
  onOpenDeal: (conversationId: string) => void;
}) {
  const s = home.summary;
  return (
    <section>
      <SectionHeader
        title="Hoje"
        subtitle={`${s.deals} negócio${s.deals === 1 ? '' : 's'} aberto${s.deals === 1 ? '' : 's'} · janela de ${home.window.days} dias para fatos`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Quentes" value={s.hot} tone="hot" hint="intenção ou urgência alta, contato ≤ 3 d" />
        <Stat
          label="Esfriando"
          value={s.cooling}
          tone="cooling"
          hint={`${s.unanswered} produtor${s.unanswered === 1 ? '' : 'es'} sem resposta > 48 h`}
        />
        <Stat label="Objeções e riscos abertos" value={s.complaints} tone="danger" />
        <Stat label="Follow-ups vencidos" value={s.overdueFollowups} tone="cooling" />
      </div>

      <div className="mt-4">
        {home.attention.length === 0 ? (
          <Empty
            title="Nada pedindo atenção agora."
            hint="Quando um negócio quente tiver objeção, esfriar em negociação ou um passo vencer, ele aparece aqui."
          />
        ) : (
          <ul className="grid gap-2">
            {home.attention.map((item) => (
              <AttentionRow key={item.conversationId} item={item} onOpen={() => onOpenDeal(item.conversationId)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AttentionRow({ item, onOpen }: { item: AttentionItem; onOpen: () => void }) {
  return (
    <li>
      <Card onClick={onOpen} className="!p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <TempDot temperature={item.temperature} withLabel />
          <span className="text-sm font-semibold">
            {item.producerName ?? item.producerPhone ?? 'Produtor'}
          </span>
          {item.farmNames.length > 0 && (
            <span className="text-xs text-muted">· {item.farmNames.join(', ')}</span>
          )}
          <StageChip stage={item.stage} />
          <span className="ml-auto flex flex-wrap gap-1">
            {item.reasons.map((r) => (
              <Chip key={r} tone={r === 'hot_with_pain' ? 'danger' : 'warning'}>
                {REASON_LABEL[r]}
              </Chip>
            ))}
          </span>
        </div>
        <div className="mt-2 grid gap-1 text-[13px] sm:grid-cols-2">
          <p className="text-muted">
            <span className="font-medium text-text">Dor:</span>{' '}
            {item.painPoint ?? <span className="text-faint">—</span>}
          </p>
          <p>
            <span className="font-medium text-accent">Próximo passo:</span> {item.nextAction}
          </p>
        </div>
        <div className="mt-1.5 text-[11px] text-faint">
          {item.rtvName ? `RTV ${item.rtvName}` : 'Sem RTV'} · último contato{' '}
          {relativeTime(item.lastMessageAt)}
          {item.blockerSubtype ? ` · gargalo ${blockerLabel(item.blockerSubtype)}` : ''}
        </div>
      </Card>
    </li>
  );
}

// ---------------------------------------------------------------------------

function Radar({
  rows,
  activeRtv,
  onPick,
}: {
  rows: RadarRow[];
  activeRtv?: string;
  onPick: (rtvUserId: string | null) => void;
}) {
  return (
    <section>
      <SectionHeader
        title="Radar de Performance"
        subtitle="Temperatura da carteira por RTV. Clique para cortar o painel por vendedor."
      />
      <DataTable
        rows={rows}
        rowKey={(r) => r.rtvUserId ?? '_none'}
        activeKey={activeRtv ?? null}
        onRowClick={(r) => onPick(r.rtvUserId)}
        empty={
          <Empty
            title="Sem negócios classificados ainda."
            hint="O radar aparece assim que o worker analisar a primeira conversa."
          />
        }
        columns={[
          {
            key: 'rtv',
            header: 'RTV',
            render: (r) => (
              <div className="font-medium">
                {r.rtvName}
                <div className="text-[11px] text-faint">{r.deals} negócio{r.deals === 1 ? '' : 's'}</div>
              </div>
            ),
          },
          {
            key: 'bar',
            header: 'Carteira',
            className: 'min-w-[220px]',
            render: (r) => (
              <div>
                <TempBar hot={r.hot} warm={r.warm} cooling={r.cooling} cold={r.cold} />
                <div className="mt-1 flex gap-3 text-[11px] text-muted">
                  <span className="text-hot">{r.hot} quente</span>
                  <span className="text-warm">{r.warm} morno</span>
                  <span className="text-cooling">{r.cooling} esfriando</span>
                  <span className="text-cold">{r.cold} frio</span>
                </div>
              </div>
            ),
          },
          { key: 'unanswered', header: 'Sem resposta', align: 'right', render: (r) => r.unanswered },
          { key: 'complaints', header: 'Objeções/riscos', align: 'right', render: (r) => r.complaints },
          { key: 'overdue', header: 'Atrasados', align: 'right', render: (r) => r.overdueFollowups },
          {
            key: 'score',
            header: 'Precisa de ajuda',
            align: 'right',
            render: (r) => (
              <span className={cx('font-semibold', r.score >= 6 ? 'text-danger' : r.score >= 3 ? 'text-cooling' : 'text-muted')}>
                {r.score}
              </span>
            ),
          },
        ]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

function PipelineSection({
  home,
  onOpenDeal,
}: {
  home: DashboardHome;
  onOpenDeal: (conversationId: string) => void;
}) {
  const stages = home.pipeline.byStage.filter((s) => s.stage !== 'SEM_NEGOCIO');
  const noDeal = home.pipeline.byStage.find((s) => s.stage === 'SEM_NEGOCIO');
  return (
    <section>
      <SectionHeader
        title="Pipeline Invisível"
        subtitle={`${home.pipeline.open} negócio${home.pipeline.open === 1 ? '' : 's'} em andamento, agrupados pelo que a IA leu nas conversas — sem funil preenchido.`}
        right={
          noDeal && noDeal.count > 0 ? (
            <span className="text-xs text-faint">{noDeal.count} conversa{noDeal.count === 1 ? '' : 's'} sem negócio</span>
          ) : null
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((col) => (
          <div key={col.stage} className="rounded-card border border-border bg-surface/60 p-2.5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{STAGE_LABEL[col.stage]}</span>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs tabular-nums text-muted">
                {col.count}
              </span>
            </div>
            <div className="grid gap-2">
              {col.deals.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-faint">—</p>
              )}
              {col.deals.slice(0, 12).map((d) => (
                <DealMini key={d.conversationId} deal={d} onOpen={() => onOpenDeal(d.conversationId)} />
              ))}
              {col.deals.length > 12 && (
                <p className="px-1 text-center text-[11px] text-faint">
                  +{col.deals.length - 12} — use os filtros para reduzir
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline gap-2">
          <h3 className="text-sm font-semibold">Gargalos</h3>
          <span className="text-xs text-muted">
            o que está travando — pistas de valor em texto, R$ apurado só com ERP
          </span>
        </div>
        {home.pipeline.byBlocker.length === 0 ? (
          <Empty title="Nenhum gargalo identificado." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {home.pipeline.byBlocker.map((b) => (
              <Card key={b.blockerSubtype} className="!p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{blockerLabel(b.blockerSubtype)}</span>
                  <span className="text-2xl font-semibold tabular-nums text-cooling">{b.count}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {b.count === 1 ? 'cliente aguardando' : 'clientes aguardando'}
                </p>
                {b.moneyHints.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {b.moneyHints.slice(0, 6).map((m) => (
                      <Chip key={m} tone="neutral">{m}</Chip>
                    ))}
                  </div>
                )}
                <ul className="mt-3 grid gap-1">
                  {b.deals.slice(0, 4).map((d) => (
                    <li key={d.conversationId}>
                      <button
                        onClick={() => onOpenDeal(d.conversationId)}
                        className="flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left text-[13px] hover:bg-surface-2"
                      >
                        <TempDot temperature={d.temperature} />
                        <span className="truncate">{d.producerName ?? d.producerPhone ?? 'Produtor'}</span>
                        <span className="ml-auto text-[11px] text-faint">{d.rtvName ?? '—'}</span>
                      </button>
                    </li>
                  ))}
                  {b.deals.length > 4 && (
                    <li className="px-1.5 text-[11px] text-faint">+{b.deals.length - 4}</li>
                  )}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DealMini({ deal, onOpen }: { deal: DealCard; onOpen: () => void }) {
  return (
    <Card onClick={onOpen} className="!p-3">
      <div className="flex items-center gap-2">
        <TempDot temperature={deal.temperature} />
        <span className="truncate text-sm font-semibold">
          {deal.producerName ?? deal.producerPhone ?? 'Produtor'}
        </span>
        <span className="ml-auto text-[11px] text-faint">{relativeTime(deal.lastMessageAt)}</span>
      </div>
      {deal.farmNames.length > 0 && (
        <div className="mt-0.5 truncate text-[11px] text-muted">{deal.farmNames.join(', ')}</div>
      )}
      <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted">{deal.contextSummary}</p>
      <p className="mt-1.5 line-clamp-2 text-xs leading-snug">
        <span className="font-medium text-accent">{KIND_LABEL[deal.nextActionKind] ?? 'Próximo'}:</span>{' '}
        {deal.nextAction}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {deal.blockerSubtype && <Chip tone="warning">{blockerLabel(deal.blockerSubtype)}</Chip>}
        {deal.unanswered && <Chip tone="danger">sem resposta</Chip>}
        <span className="ml-auto text-[11px] text-faint">{deal.rtvName ?? ''}</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Filters({
  home,
  query,
  onChange,
}: {
  home: DashboardHome;
  query: HomeQuery;
  onChange: (next: HomeQuery) => void;
}) {
  const set = (patch: Partial<HomeQuery>) => onChange({ ...query, ...patch });
  const hasCut = Boolean(
    query.rtvUserId || query.farmId || query.crop || query.region || query.productKey,
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        value={query.days ?? 7}
        onChange={(days) => set({ days })}
        options={[
          { value: 7, label: '7 d' },
          { value: 14, label: '14 d' },
          { value: 30, label: '30 d' },
        ]}
      />
      <Select
        label="RTV"
        value={query.rtvUserId ?? ''}
        onChange={(v) => set({ rtvUserId: v || undefined })}
        options={home.cuts.rtvs.map((r) => ({ value: r.id, label: r.name }))}
      />
      <Select
        label="Fazenda"
        value={query.farmId ?? ''}
        onChange={(v) => set({ farmId: v || undefined })}
        options={home.cuts.farms.map((f) => ({ value: f.id, label: f.name }))}
      />
      <Select
        label="Cultura"
        value={query.crop ?? ''}
        onChange={(v) => set({ crop: v || undefined })}
        options={home.cuts.crops.map((c) => ({ value: c, label: c }))}
      />
      <Select
        label="Região"
        value={query.region ?? ''}
        onChange={(v) => set({ region: v || undefined })}
        options={home.cuts.regions.map((r) => ({ value: r, label: r }))}
      />
      <Select
        label="Produto"
        value={query.productKey ?? ''}
        onChange={(v) => set({ productKey: v || undefined })}
        options={home.cuts.products.map((p) => ({ value: p, label: p }))}
      />
      {hasCut && (
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => onChange({ days: query.days })}>
          Limpar
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  if (!options.length && !value) return null;
  return (
    <select
      className={cx('input !w-auto !py-1.5 text-sm', value && '!border-accent/60')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
