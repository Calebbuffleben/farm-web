'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listConversations,
  listMessages,
  sendAudio,
  sendText,
  startCall,
  type ConversationSummary,
  type InboxMessage,
} from '@/lib/inbox-api';
import Link from 'next/link';
import { fetchMe, fetchMediaUrl, type Me } from '@/lib/api';
import {
  fetchMySession,
  reportEligibility,
  sendReport,
  type WaSessionState,
} from '@/lib/wa-session-api';
import { useAudioRecorder } from '@/lib/use-audio-recorder';
import { useTwilioDevice } from '@/lib/use-twilio-device';
import { cx, KIND_LABEL, StageChip, TempDot } from '@/components/ui';
import { DealCardBoard } from './deal-card';

const POLL_MS = 5000;
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [session, setSession] = useState<WaSessionState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    const m = params.get('m');
    if (c) setSelectedId(c);
    if (m) setHighlightId(m);
    fetchMe().then(setMe).catch(() => undefined);
  }, []);

  // Estado do WhatsApp do próprio usuário — banner Conectar / Reconectar.
  useEffect(() => {
    const load = () => fetchMySession().then(setSession).catch(() => undefined);
    load();
    const timer = setInterval(load, POLL_MS * 6);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = me ? ADMIN_ROLES.has(me.membership.role) : false;
  const sessionDropped = session?.status === 'DISABLED' && Boolean(session.connectedAt);
  const neverConnected =
    session?.status === 'NEVER' || (session?.status === 'DISABLED' && !session.connectedAt);

  const refresh = useCallback(() => {
    listConversations()
      .then((rows) => {
        setConversations(rows);
        setListError(null);
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : 'Não deu para carregar as conversas');
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      {sessionDropped && (
        <Banner tone="error">
          Seu WhatsApp desconectou — nada chega ao Inbox e nenhum relatório sai até reconectar.{' '}
          <Link href="/settings" className="underline">
            Reconectar
          </Link>
        </Banner>
      )}
      {!sessionDropped && neverConnected && !isAdmin && me && (
        <Banner tone="info">
          Conecte seu WhatsApp para as conversas com produtores aparecerem aqui.{' '}
          <Link href="/settings" className="underline">
            Conectar agora
          </Link>{' '}
          · leva 1 minuto, direto do celular.
        </Banner>
      )}
      <div
        className={cx(
          'grid gap-4',
          selected ? 'grid-cols-1 md:grid-cols-[minmax(280px,360px)_1fr]' : 'grid-cols-1',
        )}
        style={{ height: 'calc(100dvh - 104px)' }}
      >
        <aside
          className={cx(
            'card flex flex-col overflow-hidden !p-0',
            selected && 'hidden md:flex',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <strong className="text-sm">Conversas</strong>
            <span className="text-[11px] text-faint">{conversations.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!loaded && <p className="muted p-4 text-sm">Carregando…</p>}
            {loaded && listError && <p className="error p-4 text-sm">{listError}</p>}
            {loaded && !listError && conversations.length === 0 && (
              <EmptyList sessionActive={session?.status === 'ACTIVE'} isAdmin={isAdmin} />
            )}
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        </aside>

        {selected && (
          <ChatPane
            key={selected.id}
            conversation={selected}
            highlightMessageId={highlightId}
            isAdmin={isAdmin}
            onClose={() => {
              setSelectedId(null);
              setHighlightId(null);
            }}
            onChanged={refresh}
          />
        )}
      </div>
    </>
  );
}

function EmptyList({ sessionActive, isAdmin }: { sessionActive: boolean; isAdmin: boolean }) {
  return (
    <div className="muted grid gap-2 p-4 text-sm">
      {sessionActive ? (
        <>
          <p>WhatsApp conectado. Nenhuma conversa ainda.</p>
          <p>
            Teste agora: peça a um produtor que mande um &quot;oi&quot; para o seu número — ou
            mande você, pelo celular. A conversa aparece aqui em segundos.
          </p>
        </>
      ) : (
        <>
          <p>Nenhuma conversa ainda.</p>
          {!isAdmin && (
            <p>
              <Link href="/settings" className="btn inline-block">
                Conectar meu WhatsApp
              </Link>
            </p>
          )}
          <p>
            Sem conexão? Em Configurações você também pode{' '}
            <Link href="/settings" className="text-accent">
              importar um export .txt
            </Link>{' '}
            de uma conversa.
          </p>
        </>
      )}
    </div>
  );
}

function ConversationRow({
  conversation: c,
  active,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const brief = c.brief ?? null;
  return (
    <button
      onClick={onSelect}
      className={cx(
        'block w-full border-b border-border px-4 py-3 text-left transition hover:bg-surface-2/70',
        active && 'bg-surface-2',
      )}
    >
      <div className="flex items-center gap-2">
        {brief ? (
          <TempDot temperature={brief.temperature} />
        ) : (
          <span className="inline-block size-2 rounded-full bg-surface-3" />
        )}
        <strong className="truncate text-sm">{c.producer?.name ?? c.producerPhone}</strong>
        <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs text-muted">
          <ChannelBadge kind={c.channelKind} />
          {c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}
        </span>
      </div>
      <div className="mt-0.5 truncate pl-4 text-[13px] text-muted">{previewOf(c)}</div>
      {brief && brief.stage !== 'SEM_NEGOCIO' && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-4">
          <StageChip stage={brief.stage} />
          <span className="truncate text-[11px] text-faint">
            <span className="text-accent">{KIND_LABEL[brief.nextActionKind] ?? 'Próximo'}:</span>{' '}
            {brief.nextAction}
          </span>
        </div>
      )}
    </button>
  );
}

function Banner({ tone, children }: { tone: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        'mb-3 rounded-control border px-3.5 py-2.5 text-sm',
        tone === 'error' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-border bg-surface',
      )}
    >
      {children}
    </div>
  );
}

/** Gestor dispara o resumo no WhatsApp do RTV; a fila aplica delay/rampa. */
function ReportButton({ conversationId }: { conversationId: string }) {
  const [elig, setElig] = useState<{ eligible: boolean; reason: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    reportEligibility(conversationId).then(setElig).catch(() => undefined);
  }, [conversationId]);

  async function onSend() {
    setBusy(true);
    setNote(null);
    try {
      const r = await sendReport(conversationId);
      setNote(
        r.queued
          ? `Na fila — sai por volta de ${new Date(r.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
          : 'Enviado.',
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Falha ao enfileirar');
    } finally {
      setBusy(false);
    }
  }

  if (!elig) return null;
  return (
    <span className="ml-auto flex items-center gap-2 text-xs">
      {note && <span className="muted">{note}</span>}
      {!elig.eligible && <span className="muted">Relatório: {elig.reason}</span>}
      <button
        className="btn !px-3 !py-1.5 text-[13px]"
        disabled={!elig.eligible || busy}
        onClick={() => void onSend()}
        title={elig.reason ?? 'Resumo com os fatos abertos + opção de parar'}
      >
        Enviar relatório
      </button>
    </span>
  );
}

function previewOf(c: ConversationSummary): string {
  const m = c.lastMessage;
  if (!m) return '—';
  const prefix = m.direction === 'OUT' ? 'Você: ' : '';
  if (m.type === 'TEXT') return prefix + (m.body ?? '');
  if (m.type === 'AUDIO') return `${prefix}🎙 áudio${m.transcript ? ` — ${m.transcript}` : ''}`;
  return `${prefix}[${m.type.toLowerCase()}]`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function channelBadgeLabel(kind: ConversationSummary['channelKind'] | undefined): string {
  if (kind === 'VOICE') return 'VOZ';
  if (kind === 'EMAIL') return 'E-MAIL';
  if (kind === 'WA_SESSION') return 'WHATSAPP';
  return 'WABA';
}

function ChannelBadge({ kind }: { kind: ConversationSummary['channelKind'] | undefined }) {
  return (
    <span className="rounded-md border border-border px-1.5 py-px text-[10px] font-bold tracking-wide text-muted">
      {channelBadgeLabel(kind)}
    </span>
  );
}

function ChatPane({
  conversation,
  highlightMessageId,
  isAdmin,
  onClose,
  onChanged,
}: {
  conversation: ConversationSummary;
  highlightMessageId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [foneOn, setFoneOn] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorder = useAudioRecorder();
  const isVoice = conversation.channelKind === 'VOICE';
  const isEmail = conversation.channelKind === 'EMAIL';
  const isWaSession = conversation.channelKind === 'WA_SESSION';
  const needsSubject = isEmail && !conversation.emailSubject;
  const fone = useTwilioDevice(isVoice && foneOn);

  const refresh = useCallback(() => {
    listMessages(conversation.id)
      .then((rows) => {
        setMessages(rows);
        setSendError(null);
      })
      .catch((err) => {
        setSendError(err instanceof Error ? err.message : 'Não deu para carregar as mensagens');
      });
  }, [conversation.id]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const count = messages.length;
  useEffect(() => {
    if (highlightMessageId) {
      document.getElementById(`msg-${highlightMessageId}`)?.scrollIntoView({ block: 'center' });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [count, highlightMessageId]);

  async function onSendText() {
    const text = draft.trim();
    if (!text || sending) return;
    if (needsSubject && !subjectDraft.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await sendText(
        conversation.id,
        text,
        needsSubject ? subjectDraft.trim() || undefined : undefined,
      );
      setDraft('');
      setSubjectDraft('');
      refresh();
      onChanged();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function onSoftCall() {
    setSendError(null);
    try {
      await fone.connect(conversation.producerPhone);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Falha no softphone');
    }
  }

  async function onCall() {
    if (calling) return;
    setCalling(true);
    setSendError(null);
    try {
      await startCall(conversation.id);
      onChanged();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Falha ao ligar');
    } finally {
      setCalling(false);
    }
  }

  async function onStopRecording() {
    const result = await recorder.stop();
    if (!result) return;
    setSending(true);
    setSendError(null);
    try {
      const ext = result.mimeType.includes('mp4')
        ? 'm4a'
        : result.mimeType.includes('ogg')
          ? 'ogg'
          : 'webm';
      await sendAudio(conversation.id, result.blob, `audio.${ext}`);
      refresh();
      onChanged();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Falha ao enviar áudio');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card flex min-h-0 flex-col overflow-hidden !p-0">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onClose}
          className="text-lg text-muted hover:text-text"
          aria-label="Fechar conversa"
        >
          ←
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <strong className="truncate text-sm">
              {conversation.producer?.name ?? conversation.producerPhone}
            </strong>
            <ChannelBadge kind={conversation.channelKind} />
          </div>
          <div className="truncate text-xs text-muted">
            {conversation.producerPhone} · via {conversation.wabaNumber.displayNumber}
          </div>
        </div>
        {isWaSession && isAdmin && <ReportButton conversationId={conversation.id} />}
      </header>

      {/* Card de Bordo: recarrega quando chega mensagem e em intervalo (análise é assíncrona). */}
      <DealCardBoard conversationId={conversation.id} refreshKey={count} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} highlight={m.id === highlightMessageId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-border p-3">
        {sendError && <p className="error mb-2 text-[13px]">{sendError}</p>}
        {isVoice ? (
          <div>
            <p className="muted mb-2 text-[13px]">
              A transcrição entra quando a Twilio envia a gravação. Não há texto neste canal.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={onCall} disabled={calling}>
                {calling ? 'Ligando…' : 'Ligar'}
              </button>
              <button
                className={foneOn ? 'btn-ghost' : 'btn'}
                onClick={() => setFoneOn((on) => !on)}
              >
                {foneOn ? 'Desativar fone' : 'Atender no navegador'}
              </button>
              {foneOn && fone.outgoing && fone.status === 'ready' && (
                <button className="btn" onClick={() => void onSoftCall()}>
                  Ligar daqui
                </button>
              )}
              {fone.status === 'ringing' && (
                <button className="btn" onClick={fone.acceptIncoming}>
                  Atender
                </button>
              )}
              {(fone.status === 'open' || fone.status === 'ringing') && (
                <button className="btn" onClick={fone.hangup}>
                  Encerrar
                </button>
              )}
            </div>
            {foneOn && (
              <p className="muted mt-2 text-xs">
                {fone.status === 'ready' &&
                  'Fone pronto — toques também no navegador. Atenda aqui ou no celular.'}
                {fone.status === 'ringing' && 'Ligação no navegador — Atender ou Encerrar.'}
                {fone.status === 'open' && 'Em chamada.'}
                {fone.status === 'idle' && 'Ativando fone…'}
              </p>
            )}
            {fone.error && <p className="error mt-2 text-[13px]">{fone.error}</p>}
          </div>
        ) : (
          <>
            {recorder.error && <p className="error mb-2 text-[13px]">{recorder.error}</p>}
            {recorder.recording ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-danger">
                  ● Gravando {Math.floor(recorder.elapsedMs / 1000)}s
                </span>
                <button className="btn" onClick={onStopRecording} disabled={sending}>
                  Enviar
                </button>
                <button className="btn-ghost" onClick={recorder.cancel}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {needsSubject && (
                  <input
                    className="input"
                    placeholder="Assunto"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    disabled={sending}
                  />
                )}
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Mensagem…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void onSendText();
                      }
                    }}
                    disabled={sending}
                  />
                  {draft.trim() || isEmail || isWaSession ? (
                    <button
                      className="btn"
                      onClick={onSendText}
                      disabled={
                        sending || !draft.trim() || (needsSubject && !subjectDraft.trim())
                      }
                    >
                      Enviar
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={recorder.start}
                      disabled={sending}
                      aria-label="Gravar áudio"
                    >
                      🎙
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </footer>
    </section>
  );
}

function MessageBubble({ message, highlight }: { message: InboxMessage; highlight?: boolean }) {
  const mine = message.direction === 'OUT';
  return (
    <div
      id={`msg-${message.id}`}
      className={cx(
        'max-w-[78%] rounded-2xl border px-3 py-2',
        mine
          ? 'self-end rounded-br-md border-accent/25 bg-accent/10'
          : 'self-start rounded-bl-md border-border bg-surface-2',
        highlight && 'ring-2 ring-accent',
      )}
    >
      {message.type === 'TEXT' && <p className="whitespace-pre-wrap text-sm">{message.body}</p>}
      {message.type === 'AUDIO' && <AudioMessage message={message} />}
      {message.type !== 'TEXT' && message.type !== 'AUDIO' && (
        <p className="muted text-[13px]">
          [{message.type.toLowerCase()}]
          {message.mediaStatus === 'PENDING_MEDIA' && ' — baixando…'}
        </p>
      )}
      <span className="mt-1 block text-right text-[11px] text-faint">
        {new Date(message.sentAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}

function AudioMessage({ message }: { message: InboxMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (message.mediaAssetId && message.mediaStatus === 'READY') {
      fetchMediaUrl(message.mediaAssetId)
        .then((u) => {
          objectUrl = u;
          setUrl(u);
        })
        .catch(() => setFailed(true));
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message.mediaAssetId, message.mediaStatus]);

  return (
    <div>
      {message.mediaStatus === 'PENDING_MEDIA' && (
        <p className="muted text-[13px]">🎙 áudio — baixando…</p>
      )}
      {message.mediaStatus === 'FAILED' && (
        <p className="error text-[13px]">🎙 falha ao baixar o áudio</p>
      )}
      {url && <audio controls src={url} className="max-w-full" />}
      {failed && <p className="error text-[13px]">Falha ao carregar áudio</p>}
      {message.transcript && (
        <p className="muted mt-1.5 text-[13px] italic">“{message.transcript}”</p>
      )}
      {message.coachNote && (
        <div className="mt-2 rounded-control border border-border bg-surface px-2.5 py-2 text-[13px]">
          <span
            className={cx(
              'text-[10px] font-bold tracking-wide',
              message.coachTone === 'alerta'
                ? 'text-danger'
                : message.coachTone === 'oportunidade'
                  ? 'text-accent'
                  : 'text-muted',
            )}
          >
            COPILOT
            {message.coachTone && message.coachTone !== 'neutro' ? ` · ${message.coachTone}` : ''}
          </span>
          <p className="mt-1">{message.coachNote}</p>
        </div>
      )}
    </div>
  );
}
