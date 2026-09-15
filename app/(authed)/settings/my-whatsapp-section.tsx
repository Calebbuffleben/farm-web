'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  connectSession,
  fetchMySession,
  logoutSession,
  pollSession,
  requestPairingCode,
  sessionStatusLabel,
  type WaSessionState,
} from '@/lib/wa-session-api';

const POLL_MS = 4000;

function isMobile(): boolean {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * O RTV conecta o próprio número (segundo aparelho). No celular o padrão é
 * código de pareamento (não dá para escanear a própria tela); no laptop, QR.
 */
export function MyWhatsappSection() {
  const [state, setState] = useState<WaSessionState | null>(null);
  const [mode, setMode] = useState<'code' | 'qr'>('code');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(isMobile() ? 'code' : 'qr');
  }, []);

  const refresh = useCallback(() => {
    fetchMySession().then(setState).catch(() => undefined);
  }, []);
  useEffect(refresh, [refresh]);

  // Enquanto aguarda pareamento, sincroniza com o vendor e renova o QR.
  useEffect(() => {
    if (!state || state.status !== 'PENDING') return;
    const timer = setInterval(() => {
      pollSession(state.accountId, mode === 'qr')
        .then((s) => {
          setState(s);
          if (s.qrBase64) setQr(s.qrBase64);
          if (s.status === 'ACTIVE') {
            setPairingCode(null);
            setQr(null);
          }
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state, mode]);

  async function onConnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await connectSession({
        accepted,
        ...(mode === 'code' ? { phone } : {}),
      });
      setState(res);
      setPairingCode(res.pairingCode);
      setQr(res.qrBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para iniciar a conexão');
    } finally {
      setBusy(false);
    }
  }

  async function onNewCode() {
    if (!state) return;
    setBusy(true);
    setError(null);
    try {
      const { code } = await requestPairingCode(state.accountId, phone);
      setPairingCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar código');
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    if (!state) return;
    if (!window.confirm('Desconectar o WhatsApp do Farm? As conversas ficam guardadas.')) return;
    setBusy(true);
    setError(null);
    try {
      await logoutSession(state.accountId);
      setPairingCode(null);
      setQr(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar');
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const connected = state.status === 'ACTIVE';
  const pending = state.status === 'PENDING';

  return (
    <section className="card">
      <h2 style={{ fontSize: 17, marginBottom: 8 }}>Meu WhatsApp</h2>

      <p style={{ fontSize: 14, marginBottom: 12 }}>
        <StatusDot status={state.status} /> {sessionStatusLabel(state.status)}
        {state.phone ? ` · ${state.phone}` : ''}
        {connected && (
          <span className="muted">
            {' '}
            · hoje {state.todaySent}/{state.todayCap} envios (dia {state.rampDay} da rampa)
          </span>
        )}
      </p>

      {!state.vendorReady && (
        <p className="error" style={{ fontSize: 13, marginBottom: 12 }}>
          O servidor ainda não fala com a Evolution API (EVOLUTION_BASE_URL / EVOLUTION_API_KEY).
          Peça ao administrador.
        </p>
      )}
      {!state.publicUrl && (
        <p className="error" style={{ fontSize: 13, marginBottom: 12 }}>
          WA_SESSION_WEBHOOK_BASE_URL / FARM_PUBLIC_URL não configurada: o QR conecta, mas nenhuma
          mensagem chega.
        </p>
      )}

      {connected ? (
        <div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Suas conversas 1:1 aparecem no Inbox conforme chegam. Continue usando o WhatsApp
            do celular normalmente — o Farm é só um aparelho conectado a mais.
          </p>
          <button className="btn" onClick={() => void onLogout()} disabled={busy}>
            Desconectar
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.status === 'DISABLED' && state.connectedAt && (
            <p className="error" style={{ fontSize: 13 }}>
              Sua conexão caiu. Enquanto estiver assim nada chega ao Inbox e nenhum relatório é
              enviado. Reconecte abaixo — não é preciso reinstalar nada.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <ModeButton active={mode === 'code'} onClick={() => setMode('code')}>
              Estou no celular (código)
            </ModeButton>
            <ModeButton active={mode === 'qr'} onClick={() => setMode('qr')}>
              Estou no computador (QR)
            </ModeButton>
          </div>

          {mode === 'code' && !pairingCode && (
            <input
              className="input"
              placeholder="Seu número: +5566999990000"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ maxWidth: 280 }}
            />
          )}

          {!pending && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span className="muted">
                Entendo que esta conexão usa a API Web do WhatsApp (como o WhatsApp Web), está
                sujeita às políticas da Meta e pode ser interrompida. O Farm limita envios
                automáticos para proteger meu número.
              </span>
            </label>
          )}

          {!pending && (
            <button
              className="btn"
              disabled={busy || !accepted || (mode === 'code' && phone.replace(/\D/g, '').length < 10)}
              onClick={() => void onConnect()}
              style={{ alignSelf: 'flex-start' }}
            >
              {busy ? 'Preparando…' : state.status === 'DISABLED' ? 'Reconectar' : 'Conectar'}
            </button>
          )}

          {pending && mode === 'code' && (
            <div>
              {pairingCode ? (
                <>
                  <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, margin: '4px 0' }}>
                    {pairingCode}
                  </p>
                  <ol className="muted" style={{ fontSize: 13, paddingLeft: 18, margin: '8px 0' }}>
                    <li>No WhatsApp: ⋮ → Aparelhos conectados → Conectar aparelho</li>
                    <li>Toque em &quot;Conectar com número de telefone&quot;</li>
                    <li>Digite o código acima</li>
                  </ol>
                </>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>Gerando código…</p>
              )}
              <button
                onClick={() => void onNewCode()}
                disabled={busy}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13 }}
              >
                Gerar novo código
              </button>
            </div>
          )}

          {pending && mode === 'qr' && (
            <div>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${qr}`}
                  alt="QR code para conectar o WhatsApp"
                  width={240}
                  height={240}
                  style={{ borderRadius: 8, background: '#fff', padding: 8 }}
                />
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>Gerando QR…</p>
              )}
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                No celular: ⋮ → Aparelhos conectados → Conectar aparelho → aponte a câmera. O QR
                renova sozinho.
              </p>
            </div>
          )}

          {pending && (
            <p className="muted" style={{ fontSize: 12 }}>
              Aguardando o celular confirmar… esta tela atualiza sozinha.
            </p>
          )}
        </div>
      )}

      {error && <p className="error" style={{ fontSize: 13, marginTop: 8 }}>{error}</p>}
    </section>
  );
}

export function StatusDot({ status }: { status: WaSessionState['status'] }) {
  const color =
    status === 'ACTIVE'
      ? 'var(--success, #2e7d32)'
      : status === 'PENDING'
        ? 'var(--warning, #f9a825)'
        : 'var(--text-muted)';
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: color,
        marginRight: 4,
      }}
    />
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'btn' : undefined}
      style={
        active
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
      {children}
    </button>
  );
}
