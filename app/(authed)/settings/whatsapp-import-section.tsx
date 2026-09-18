'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  importWhatsappExport,
  listProducers,
  previewWhatsappExport,
  type ExportImportResult,
  type ExportPreview,
  type ProducerRow,
} from '@/lib/inbox-api';

/**
 * Plano B do canal: o RTV exporta a conversa no WhatsApp (sem mídia) e sobe
 * o .txt. Ninguém digita "nome exato do export": o Farm lista os remetentes.
 */
export function WhatsappImportSection({ myName }: { myName?: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [me, setMe] = useState('');
  const [producers, setProducers] = useState<ProducerRow[]>([]);
  const [peerPhone, setPeerPhone] = useState('');
  const [manualPhone, setManualPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportImportResult | null>(null);

  useEffect(() => {
    listProducers().then(setProducers).catch(() => undefined);
  }, []);

  async function onFile(f: File | undefined) {
    setResult(null);
    setError(null);
    setPreview(null);
    setFile(f ?? null);
    if (!f) return;
    setBusy(true);
    try {
      const p = await previewWhatsappExport(f);
      setPreview(p);
      const mine = myName
        ? p.senders.find((s) => s.name.toLowerCase().includes(myName.toLowerCase()))
        : undefined;
      setMe(mine?.name ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para ler o arquivo');
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    if (!file || !me || !peerPhone) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await importWhatsappExport(file, { rtvName: me, peerPhone }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar');
    } finally {
      setBusy(false);
    }
  }

  const phoneOptions = producers.flatMap((p) =>
    (p.phones ?? []).map((ph) => ({ phone: ph.phone, label: `${p.name} · ${ph.phone}` })),
  );

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Importar conversa do WhatsApp</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        No WhatsApp: abra a conversa → nome do contato → <strong>Exportar conversa</strong> →{' '}
        <strong>Sem mídia</strong>. Salve o .txt e escolha aqui. Reenviar o mesmo arquivo não
        duplica nada.
      </p>
      <input
        type="file"
        accept=".txt,text/plain"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {busy && !preview && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Lendo…</p>}

      {preview && !result && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14 }}>
            {preview.lines} mensagens
            {preview.firstAt && preview.lastAt
              ? ` · ${fmtDay(preview.firstAt)} a ${fmtDay(preview.lastAt)}`
              : ''}
          </p>

          <div>
            <p style={{ fontSize: 14, marginBottom: 6 }}>
              <strong>Qual desses é você?</strong>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {preview.senders.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={me === s.name ? 'btn' : undefined}
                  onClick={() => setMe(s.name)}
                  style={
                    me === s.name
                      ? undefined
                      : {
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          borderRadius: 10,
                          padding: '10px 18px',
                        }
                  }
                >
                  {s.name} <span className="muted">({s.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 14, marginBottom: 6 }}>
              <strong>Com quem é a conversa?</strong>
            </p>
            {!manualPhone && phoneOptions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <select
                  className="input"
                  style={{ maxWidth: 360 }}
                  value={peerPhone}
                  onChange={(e) => setPeerPhone(e.target.value)}
                >
                  <option value="">Produtor da carteira…</option>
                  {phoneOptions.map((o) => (
                    <option key={o.phone} value={o.phone}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setManualPhone(true);
                    setPeerPhone('');
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13 }}
                >
                  Não está na lista
                </button>
              </div>
            ) : (
              <div>
                <input
                  className="input"
                  placeholder="+5566999990000"
                  inputMode="tel"
                  value={peerPhone}
                  onChange={(e) => setPeerPhone(e.target.value)}
                  style={{ maxWidth: 260 }}
                />
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  O export não traz o número do contato. Use o telefone com DDI e DDD.
                </p>
              </div>
            )}
          </div>

          <button
            className="btn"
            disabled={busy || !me || !peerPhone}
            onClick={() => void onImport()}
            style={{ alignSelf: 'flex-start' }}
          >
            {busy ? 'Importando…' : 'Importar'}
          </button>
        </div>
      )}

      {error && <p className="error" style={{ fontSize: 13, marginTop: 8 }}>{error}</p>}
      {result && (
        <p style={{ fontSize: 14, marginTop: 12 }}>
          {result.imported} mensagens novas, {result.skipped} já existiam.{' '}
          {result.conversationId && (
            <Link href={`/inbox?c=${result.conversationId}`} style={{ color: 'var(--accent)' }}>
              Abrir no Inbox
            </Link>
          )}
        </p>
      )}
    </section>
  );
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}
