'use client';

import { useState } from 'react';
import Link from 'next/link';
import { patchFactStatus, sendDiscountReply, type FactDetail } from '@/lib/dashboard-api';
import { Chip, Drawer } from '@/components/ui';

/** Evidência de um fato: quote, ir à conversa, resolver/dispensar, alçada. */
export function FactDrawer({
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
    <Drawer
      open
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={detail.severity === 'CRITICAL' ? 'danger' : detail.severity === 'WARNING' ? 'warning' : 'neutral'}>
            {detail.kind} · {detail.subtype}
          </Chip>
          <span className="truncate">{detail.headline}</span>
        </div>
      }
    >
      <p className="text-[13px] text-muted">
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
      <blockquote className="mt-4 whitespace-pre-wrap rounded-control border-l-2 border-accent bg-surface-2 p-3 text-sm italic">
        {evidenceText}
      </blockquote>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={inboxHref} className="btn">
          Ver na conversa
        </Link>
        <button className="btn-ghost" disabled={busy} onClick={() => void setStatus('RESOLVED')}>
          Resolver
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => void setStatus('DISMISSED')}>
          Descartar
        </button>
      </div>
      {isAlcada && (
        <div className="mt-5 grid gap-2 border-t border-border pt-4">
          <label className="text-xs font-semibold text-muted">
            Autorizar resposta
            {detail.channelKind === 'VOICE' ? ' · canal de voz (não envia texto)' : ''}
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={busy}
            className="input resize-y"
          />
          <div>
            <button
              className="btn"
              disabled={busy || !replyText.trim()}
              onClick={() => void authorizeReply()}
            >
              Autorizar resposta
            </button>
          </div>
          {replyInfo && <p className="text-[13px] text-accent">{replyInfo}</p>}
          {replyError && <p className="error text-[13px]">{replyError}</p>}
        </div>
      )}
      {detail.farmState && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-1.5 text-sm font-semibold">
            Fazenda {detail.farmState.name}
            {detail.farmState.region ? ` · ${detail.farmState.region}` : ''}
          </p>
          <FarmOpenFacts raw={detail.farmState.openFacts} />
        </div>
      )}
    </Drawer>
  );
}

function FarmOpenFacts({ raw }: { raw: unknown }) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return <p className="text-[13px] text-muted">Sem fatos abertos nesta fazenda.</p>;
  }
  return (
    <ul className="grid gap-1 text-[13px]">
      {raw.slice(0, 8).map((item, i) => {
        const row = item as { headline?: string; kind?: string };
        return (
          <li key={i} className="text-muted">
            {row.kind ?? 'FATO'} — {row.headline ?? JSON.stringify(item)}
          </li>
        );
      })}
    </ul>
  );
}
