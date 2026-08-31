'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import {
  fetchDashboardHome,
  fetchFact,
  patchFactStatus,
  sendDiscountReply,
  type DashboardHome,
  type FactCard,
  type FactDetail,
  type HomeQuery,
} from '@/lib/dashboard-api';

const QUESTIONS: { key: QuestionKey; title: string }[] = [
  { key: 'moneyRisk', title: 'Que dinheiro está em risco esta semana?' },
  { key: 'objections', title: 'Quais objeções estão crescendo, por cultura e região?' },
  { key: 'followups', title: 'Que follow-ups prometidos vencem e ninguém fez?' },
  { key: 'competitor', title: 'Onde o concorrente apareceu?' },
  { key: 'rtvHelp', title: 'Qual RTV precisa de ajuda?' },
];

type QuestionKey = 'moneyRisk' | 'objections' | 'followups' | 'competitor' | 'rtvHelp';

export default function DashboardPage() {
  const [query, setQuery] = useState<HomeQuery>({ days: 7 });
  const [home, setHome] = useState<DashboardHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [open, setOpen] = useState<QuestionKey | null>('moneyRisk');
  const [detail, setDetail] = useState<FactDetail | null>(null);

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

  if (forbidden) {
    return (
      <p className="muted">
        O dashboard é para o gestor (OWNER, ADMIN ou MANAGER). O RTV usa o Inbox.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Dashboard do gestor</h1>
        <p className="muted" style={{ maxWidth: 640, lineHeight: 1.6 }}>
          Cada número abre os fatos e cada fato abre a evidência na conversa.
          moneyHint é pista de texto, não R$ apurado.
        </p>
        {home && (
          <Filters
            home={home}
            query={query}
            onChange={(next) => {
              setQuery(next);
              setDetail(null);
            }}
          />
        )}
        {home && home.unknownPending > 0 && (
          <p style={{ marginTop: 12, fontSize: 14 }}>
            <Link href="/settings" style={{ color: 'var(--accent)' }}>
              {home.unknownPending} trecho{home.unknownPending === 1 ? '' : 's'} na
              fila unknown
            </Link>
            <span className="muted"> — vínculo humano, o LLM não chute.</span>
          </p>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {!home && !error && <p className="muted">Carregando…</p>}

      {home && (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {QUESTIONS.map((q, i) => {
            const summary = summaryOf(home, q.key);
            const active = open === q.key;
            return (
              <button
                key={q.key}
                className="card"
                onClick={() => setOpen(active ? null : q.key)}
                style={{
                  padding: 18,
                  textAlign: 'left',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <span className="muted" style={{ fontSize: 12 }}>
                  Pergunta {i + 1}
                </span>
                <p style={{ marginTop: 6, fontWeight: 600, lineHeight: 1.5 }}>{q.title}</p>
                <p style={{ marginTop: 12, fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                  {summary.value}
                </p>
                {summary.hint && (
                  <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                    {summary.hint}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {home && open && (
        <QuestionBody
          home={home}
          question={open}
          onOpenFact={(id) => {
            fetchFact(id).then(setDetail).catch(() => undefined);
          }}
        />
      )}

      {detail && (
        <EvidenceDrawer
          key={detail.id}
          detail={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function summaryOf(
  home: DashboardHome,
  key: QuestionKey,
): { value: number; hint?: string } {
  const q = home.questions;
  if (key === 'moneyRisk') return { value: q.moneyRisk.count };
  if (key === 'objections')
    return {
      value: q.objections.count,
      hint: q.objections.growing
        ? `${q.objections.growing} grupo(s) crescendo vs. período anterior`
        : 'nenhum grupo crescendo vs. período anterior',
    };
  if (key === 'followups')
    return {
      value: q.followups.count,
      hint: `${q.followups.overdue} atrasado${q.followups.overdue === 1 ? '' : 's'}`,
    };
  if (key === 'competitor') return { value: q.competitor.count };
  return { value: q.rtvHelp.count, hint: 'RTVs com sinal aberto' };
}

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
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
      }}
    >
      <select
        className="input"
        style={{ width: 'auto' }}
        value={query.days ?? 7}
        onChange={(e) => set({ days: Number(e.target.value) })}
      >
        <option value={7}>7 dias</option>
        <option value={14}>14 dias</option>
        <option value={30}>30 dias</option>
      </select>
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
  return (
    <select
      className="input"
      style={{ width: 'auto', minWidth: 140 }}
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

function QuestionBody({
  home,
  question,
  onOpenFact,
}: {
  home: DashboardHome;
  question: QuestionKey;
  onOpenFact: (id: string) => void;
}) {
  if (question === 'objections') {
    const groups = home.questions.objections.groups;
    if (!groups.length) return <Empty />;
    return (
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        {groups.map((g) => (
          <div key={`${g.crop}|${g.region}`}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {g.crop} · {g.region}{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                {g.current} agora / {g.previous} antes
                {g.growing ? ' · crescendo' : ''}
              </span>
            </p>
            <FactList items={g.items} onOpen={onOpenFact} />
          </div>
        ))}
      </div>
    );
  }
  if (question === 'rtvHelp') {
    const items = home.questions.rtvHelp.items;
    if (!items.length) return <Empty />;
    return (
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        {items.map((rtv) => (
          <div key={rtv.rtvUserId ?? rtv.rtvName}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {rtv.rtvName}{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                score {rtv.score} · {rtv.critical} crítico · {rtv.overdue} atrasado
              </span>
            </p>
            <FactList items={rtv.items} onOpen={onOpenFact} />
          </div>
        ))}
      </div>
    );
  }
  const items =
    question === 'moneyRisk'
      ? home.questions.moneyRisk.items
      : question === 'followups'
        ? home.questions.followups.items
        : home.questions.competitor.items;
  if (!items.length) return <Empty />;
  return (
    <div className="card">
      <FactList items={items} onOpen={onOpenFact} />
    </div>
  );
}

function Empty() {
  return (
    <p className="muted" style={{ fontSize: 14 }}>
      Nenhum fato aberto neste recorte. Quando o worker analisar conversas, eles
      aparecem aqui — cada um clicável até a mensagem.
    </p>
  );
}

function FactList({
  items,
  onOpen,
}: {
  items: FactCard[];
  onOpen: (id: string) => void;
}) {
  return (
    <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => onOpen(item.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              color: 'var(--text)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {item.kind} · {item.severity}
              {item.farmName ? ` · ${item.farmName}` : ''}
              {item.moneyHint ? ` · ${item.moneyHint}` : ''}
            </span>
            <p style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>{item.headline}</p>
            {item.evidenceSpan && (
              <p className="muted" style={{ marginTop: 4, fontSize: 12, fontStyle: 'italic' }}>
                “{item.evidenceSpan}”
              </p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EvidenceDrawer({
  detail,
  onClose,
  onChanged,
}: {
  detail: FactDetail;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [replyText, setReplyText] = useState('Posso 3%, não 5%.');
  const [replyInfo, setReplyInfo] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const evidenceText =
    detail.evidence.transcript || detail.evidence.body || detail.evidenceSpan || '—';
  const inboxHref = `/inbox?c=${encodeURIComponent(detail.evidence.conversationId)}&m=${encodeURIComponent(detail.evidence.messageId)}`;
  const isAlcada = detail.kind === 'OBJECAO' && detail.subtype === 'preco';

  async function setStatus(status: 'RESOLVED' | 'DISMISSED') {
    setBusy(true);
    try {
      await patchFactStatus(detail.id, status);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function authorizeReply() {
    const text = replyText.trim();
    if (!text) return;
    setBusy(true);
    setReplyError(null);
    setReplyInfo(null);
    try {
      const result = await sendDiscountReply(detail.id, text);
      setReplyInfo(
        result.sent
          ? 'Resposta enviada na conversa.'
          : 'Canal de voz: ligue pelo inbox — a alçada ficou no audit.',
      );
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Falha ao autorizar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p className="muted" style={{ fontSize: 12 }}>
            {detail.kind} · {detail.subtype} · {detail.severity}
          </p>
          <h2 style={{ fontSize: 18, marginTop: 4 }}>{detail.headline}</h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 8,
            padding: '6px 12px',
          }}
        >
          Fechar
        </button>
      </div>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        {[detail.producerName, detail.farmName, detail.crop, detail.region, detail.rtvName]
          .filter(Boolean)
          .join(' · ')}
        {detail.dueAt
          ? ` · prazo ${new Date(detail.dueAt).toLocaleString('pt-BR')}`
          : detail.dueHintText
            ? ` · ${detail.dueHintText}`
            : ''}
        {detail.moneyHint ? ` · pista ${detail.moneyHint}` : ''}
      </p>
      <blockquote
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--surface-2)',
          borderRadius: 10,
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
          fontSize: 14,
        }}
      >
        {evidenceText}
      </blockquote>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <Link href={inboxHref} className="btn">
          Ver na conversa
        </Link>
        <button className="btn" disabled={busy} onClick={() => void setStatus('RESOLVED')}>
          Resolver
        </button>
        <button
          disabled={busy}
          onClick={() => void setStatus('DISMISSED')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 10,
            padding: '10px 18px',
          }}
        >
          Descartar
        </button>
      </div>
      {isAlcada && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gap: 8,
          }}
        >
          <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Autorizar resposta
            {detail.channelKind === 'VOICE' ? ' · canal de voz (não envia texto)' : ''}
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={busy}
            style={{
              width: '100%',
              resize: 'vertical',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 8,
              padding: '8px 10px',
              font: 'inherit',
            }}
          />
          <div>
            <button className="btn" disabled={busy || !replyText.trim()} onClick={() => void authorizeReply()}>
              Autorizar resposta
            </button>
          </div>
          {replyInfo && <p style={{ fontSize: 13, color: 'var(--accent)' }}>{replyInfo}</p>}
          {replyError && <p className="error" style={{ fontSize: 13 }}>{replyError}</p>}
        </div>
      )}
      {detail.farmState && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>
            Fazenda {detail.farmState.name}
            {detail.farmState.region ? ` · ${detail.farmState.region}` : ''}
          </p>
          <FarmOpenFacts raw={detail.farmState.openFacts} />
        </div>
      )}
    </div>
  );
}

function FarmOpenFacts({ raw }: { raw: unknown }) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>Sem fatos abertos nesta fazenda.</p>;
  }
  return (
    <ul style={{ listStyle: 'none', fontSize: 13, display: 'grid', gap: 4 }}>
      {raw.slice(0, 8).map((item, i) => {
        const row = item as { headline?: string; kind?: string };
        return (
          <li key={i} className="muted">
            {row.kind ?? 'FATO'} — {row.headline ?? JSON.stringify(item)}
          </li>
        );
      })}
    </ul>
  );
}
