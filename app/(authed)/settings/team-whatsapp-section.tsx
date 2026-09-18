'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listSessions,
  logoutSession,
  sessionStatusLabel,
  type WaSessionState,
} from '@/lib/wa-session-api';
import { StatusDot } from './my-whatsapp-section';

/**
 * Visão do gestor: WhatsApp de cada RTV (conectado / caiu / nunca), envios do
 * dia vs teto da rampa, e o checklist de migração para o canal oficial.
 */
export function TeamWhatsappSection() {
  const [rows, setRows] = useState<WaSessionState[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showMigrate, setShowMigrate] = useState(false);

  const refresh = useCallback(() => {
    listSessions().then(setRows).catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);

  async function onDisconnect(row: WaSessionState) {
    if (!window.confirm(`Desconectar o WhatsApp de ${row.assignedUser?.name ?? row.phone ?? 'este RTV'}?`)) return;
    setBusyId(row.accountId);
    try {
      await logoutSession(row.accountId);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>WhatsApp do time</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Cada RTV conecta o próprio número em Configurações → Meu WhatsApp. Convide pelo link em
        &quot;Time&quot; acima; o convidado cai direto no Inbox com o passo a passo.
      </p>
      {rows.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>Nenhum RTV conectou ainda.</p>
      )}
      {rows.map((r) => (
        <div
          key={r.accountId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderTop: '1px solid var(--border)',
            fontSize: 14,
          }}
        >
          <span style={{ minWidth: 200 }}>
            <StatusDot status={r.status} />
            {r.assignedUser?.name ?? r.assignedUser?.email ?? '—'}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            {sessionStatusLabel(r.status)}
            {r.phone ? ` · ${r.phone}` : ''}
            {r.status === 'ACTIVE' ? ` · hoje ${r.todaySent}/${r.todayCap} (dia ${r.rampDay})` : ''}
          </span>
          {(r.status === 'ACTIVE' || r.status === 'PENDING') && (
            <button
              disabled={busyId === r.accountId}
              onClick={() => void onDisconnect(r)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
              }}
            >
              Desconectar
            </button>
          )}
        </div>
      ))}

      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button
          onClick={() => setShowMigrate((v) => !v)}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13, padding: 0 }}
        >
          {showMigrate ? 'Ocultar' : 'Migrar para WhatsApp oficial (Cloud API) — checklist'}
        </button>
        {showMigrate && (
          <ol style={{ fontSize: 13, paddingLeft: 18, marginTop: 8, lineHeight: 1.7 }}>
            <li>Empresa com CNPJ + site HTTPS + Meta Business Manager verificado.</li>
            <li>Número do RTV na Cloud API (coexistence via Embedded Signup de um BSP, ou número
              dedicado): token permanente, phone_number_id e business_id.</li>
            <li>No Farm: Desconectar o RTV aqui (a fila de relatório para sozinha).</li>
            <li>Na Evolution, a instância do RTV vira <code>WHATSAPP-BUSINESS</code> com essas
              credenciais; webhook da Meta aponta para a Evolution. O Farm não muda: mesmo
              webhook, mesmo envio, mesma conversa — a identidade é o número, não o motor.</li>
            <li>Runbook completo: <code>farm/planejamento-captura/05-migrar-oficial.md</code>.</li>
          </ol>
        )}
      </div>
    </section>
  );
}
