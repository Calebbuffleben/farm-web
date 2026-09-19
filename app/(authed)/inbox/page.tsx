'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listConversations,
  listMembers,
  listMessages,
  sendAudio,
  sendText,
  startCall,
  type ConversationSummary,
  type InboxMessage,
  type Member,
} from '@/lib/inbox-api';
import Link from 'next/link';
import { fetchMediaUrl } from '@/lib/api';
import { useMe } from '@/lib/me-context';
import {
  fetchMySession,
  reportEligibility,
  sendReport,
  type WaSessionState,
} from '@/lib/wa-session-api';
import { useAudioRecorder } from '@/lib/use-audio-recorder';
import { useTwilioDevice } from '@/lib/use-twilio-device';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import { Chip, cx, Icon, KIND_LABEL, StageChip, TempDot } from '@/components/ui';
import { DealCardBoard } from './deal-card';

const LIST_POLL_MS = 20_000;
const MESSAGE_POLL_MS = 5_000;
const SESSION_POLL_MS = 30_000;
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const me = useMe();
  const [session, setSession] = useState<WaSessionState | null>(null);
  const [search, setSearch] = useState('');
  const [rtvUserId, setRtvUserId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    const m = params.get('m');
    const rtv = params.get('rtv');
    if (c) setSelectedId(c);
    if (m) setHighlightId(m);
    if (rtv) setRtvUserId(rtv);
  }, []);

  const loadSession = useCallback(() => {
    fetchMySession().then(setSession).catch(() => undefined);
  }, []);
  useVisibleInterval(loadSession, SESSION_POLL_MS);

  const isAdmin = me ? ADMIN_ROLES.has(me.membership.role) : false;
  const sessionDropped = session?.status === 'DISABLED' && Boolean(session.connectedAt);
  const neverConnected =
    session?.status === 'NEVER' || (session?.status === 'DISABLED' && !session.connectedAt);

  useEffect(() => {
    if (!isAdmin) return;
    listMembers().then(setMembers).catch(() => undefined);
  }, [isAdmin]);

  const refresh = useCallback(() => {
    listConversations(isAdmin ? rtvUserId || undefined : undefined)
      .then((rows) => {
        setConversations(rows);
        setListError(null);
      })
      .catch((err) => {
        setListError(err instanceof Error ? err.message : 'Não deu para carregar as conversas');
      })
      .finally(() => setLoaded(true));
  }, [isAdmin, rtvUserId]);

  useVisibleInterval(refresh, LIST_POLL_MS);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const visibleConversations = conversations.filter((c) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return true;
    return [c.producer?.name, c.producerPhone, previewOf(c), isAdmin ? rtvLabel(c.assignedUser) : null]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase('pt-BR').includes(term));
  });

  function onPickRtv(next: string) {
    setRtvUserId(next);
    setSelectedId(null);
    setHighlightId(null);
    replaceInboxQuery({ c: null, m: null, rtv: next || null });
  }

  function onSelectConversation(id: string) {
    setSelectedId(id);
    replaceInboxQuery({ c: id, rtv: rtvUserId || null });
  }

  return (
    <div className="grid gap-4">
      <header className={cx('reveal flex items-start justify-between gap-4 border-b border-border pb-5', selected && 'hidden md:flex')}>
        <div>
          <div className="eyebrow mb-3 flex items-center gap-2">
            <span className="h-px w-8 bg-copper" />
            Relacionamento
          </div>
          <h1 className="page-title">Conversas</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Atendimento do time e contexto comercial em um só lugar.</p>
        </div>
        <div className="hidden items-center gap-2 border border-border bg-surface px-3 py-2 text-xs text-muted sm:flex">
          <span className={cx('size-2 rounded-full', session?.status === 'ACTIVE' ? 'bg-warm' : 'bg-cold')} />
          WhatsApp {session?.status === 'ACTIVE' ? 'conectado' : 'não conectado'}
        </div>
      </header>
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
        className="grid min-h-0 gap-4 md:h-[calc(100dvh-12.5rem)] md:grid-cols-[minmax(280px,360px)_1fr]"
      >
        <aside
          className={cx(
            'card flex flex-col overflow-hidden !p-0',
            selected && 'hidden md:flex',
          )}
        >
          <div className="border-b border-border p-3">
            {isAdmin && (
              <select
                value={rtvUserId}
                onChange={(event) => onPickRtv(event.target.value)}
                className="input mb-2 block w-full !min-h-9 !bg-surface-2 !py-1.5 text-sm"
                aria-label="Filtrar conversas por RTV"
              >
                <option value="">Todos os RTVs</option>
                {members.map((m) => {
                  const id = memberUserId(m);
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {memberLabel(m)}
                    </option>
                  );
                })}
              </select>
            )}
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input !min-h-9 !bg-surface-2 !py-1.5 !pl-9 text-sm"
                placeholder={isAdmin ? 'Buscar produtor, RTV ou mensagem' : 'Buscar produtor ou mensagem'}
                aria-label="Buscar conversas"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!loaded && <p className="muted p-4 text-sm">Carregando…</p>}
            {loaded && listError && <p className="error p-4 text-sm">{listError}</p>}
            {loaded && !listError && conversations.length === 0 && (
              <EmptyList sessionActive={session?.status === 'ACTIVE'} isAdmin={isAdmin} />
            )}
            {loaded && !listError && conversations.length > 0 && visibleConversations.length === 0 && (
              <div className="grid place-items-center px-6 py-12 text-center">
                <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
                <p className="mt-1 text-xs text-muted">Tente buscar por outro nome ou termo.</p>
              </div>
            )}
            {visibleConversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                showRtv={isAdmin}
                onSelect={() => onSelectConversation(c.id)}
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
              replaceInboxQuery({ c: null, m: null, rtv: rtvUserId || null });
            }}
            onChanged={refresh}
          />
        )}
        {!selected && (
          <section className="card hidden min-h-0 place-items-center overflow-hidden !p-0 md:grid">
            <div className="max-w-sm px-8 text-center">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent">
                <Icon name="inbox" className="size-6" />
              </div>
              <h2 className="font-display text-[1.7rem] tracking-[-0.03em]">Selecione uma conversa</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Abra um relacionamento para ver o histórico, o resumo da IA e o próximo passo recomendado.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
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
  showRtv,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  showRtv: boolean;
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
        <div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold uppercase text-muted">
          {(c.producer?.name ?? c.producerPhone).slice(0, 2)}
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface">
            {brief ? <TempDot temperature={brief.temperature} /> : <span className="block size-2 rounded-full bg-cold" />}
          </span>
        </div>
        <strong className="truncate text-sm">{c.producer?.name ?? c.producerPhone}</strong>
        <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs text-muted">
          <ChannelBadge kind={c.channelKind} />
          {c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}
        </span>
      </div>
      {showRtv && (
        <div className="mt-0.5 truncate pl-11 text-[11px] font-medium text-copper">
          RTV {rtvLabel(c.assignedUser)}
        </div>
      )}
      <div className="mt-0.5 truncate pl-11 text-[13px] text-muted">{previewOf(c)}</div>
      {brief && brief.stage !== 'SEM_NEGOCIO' && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-11">
          <StageChip stage={brief.stage} />
          {brief.analysisQuality !== 'COMPLETE' && (
            <Chip tone="warning">
              {brief.analysisQuality === 'STALE' ? 'desatualizado' : 'revisar'}
            </Chip>
          )}
          <span className="truncate text-[11px] text-faint">
            <span className="text-copper">{KIND_LABEL[brief.nextActionKind] ?? 'Próximo'}:</span>{' '}
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
  const tag = `[${m.type.toLowerCase()}]`;
  return m.body ? `${prefix}${tag} ${m.body}` : `${prefix}${tag}`;
}

function rtvLabel(user: ConversationSummary['assignedUser'] | null | undefined): string {
  if (!user) return 'Sem RTV';
  return user.name?.trim() || user.email;
}

function memberUserId(m: Member): string {
  return m.user?.id ?? m.userId ?? '';
}

function memberLabel(m: Member): string {
  return m.user?.name ?? m.name ?? m.user?.email ?? m.email ?? m.id;
}

function replaceInboxQuery(patch: { c?: string | null; m?: string | null; rtv?: string | null }) {
  const params = new URLSearchParams(window.location.search);
  for (const key of ['c', 'm', 'rtv'] as const) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
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
    <span className="border border-border px-1.5 py-px font-mono text-[10px] font-medium tracking-[0.08em] text-muted">
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

  useVisibleInterval(refresh, MESSAGE_POLL_MS);

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
    <section className="card relative flex min-h-[70dvh] flex-col overflow-hidden !p-0 md:min-h-0">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5">
        <button
          onClick={onClose}
          className="text-lg text-muted hover:text-text"
          aria-label="Fechar conversa"
        >
          <span aria-hidden>←</span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <strong className="truncate text-sm">
              {conversation.producer?.name ?? conversation.producerPhone}
            </strong>
            <ChannelBadge kind={conversation.channelKind} />
          </div>
          <div className="truncate text-xs text-muted">
            {conversation.producerPhone}
            {isAdmin
              ? ` · via ${rtvLabel(conversation.assignedUser)}${
                  conversation.wabaNumber.displayNumber
                    ? ` · ${conversation.wabaNumber.displayNumber}`
                    : ''
                }`
              : ` · via ${conversation.wabaNumber.displayNumber}`}
          </div>
        </div>
        {isWaSession && isAdmin && <ReportButton conversationId={conversation.id} />}
      </header>

      {/* Card de Bordo: recarrega quando chega mensagem e em intervalo (análise é assíncrona). */}
      <DealCardBoard
        className="min-h-0 max-h-[min(38%,18rem)] shrink-0"
        conversationId={conversation.id}
        refreshKey={count}
        hasProducerMessage={
          messages.some((m) => m.direction === 'IN') ||
          conversation.lastMessage?.direction === 'IN'
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-[#f7f9fc] p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} highlight={m.id === highlightMessageId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="shrink-0 border-t border-border bg-surface p-3">
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
                    aria-label="Assunto do e-mail"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    disabled={sending}
                  />
                )}
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Mensagem…"
                    aria-label="Mensagem"
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
                      <Icon name="mic" className="size-5" />
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
          ? 'self-end border-accent/20 bg-accent text-accent-ink'
          : 'self-start border-border bg-surface-2',
        highlight && 'ring-2 ring-accent',
      )}
    >
      {message.type === 'TEXT' && <p className="whitespace-pre-wrap text-sm">{message.body}</p>}
      {message.type === 'AUDIO' && <AudioMessage message={message} />}
      {message.type !== 'TEXT' && message.type !== 'AUDIO' && (
        <>
          <p className="muted text-[13px]">
            [{message.type.toLowerCase()}]
            {message.mediaStatus === 'PENDING_MEDIA' && ' — baixando…'}
          </p>
          {message.body ? (
            <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
          ) : null}
        </>
      )}
      <span className={cx('mt-1 block text-right text-[11px]', mine ? 'text-white/65' : 'text-faint')}>
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
      {message.mediaStatus === 'PENDING_MEDIA' && !message.transcript && (
        <p className="muted text-[13px]">🎙 áudio — baixando…</p>
      )}
      {message.mediaStatus === 'FAILED' && !message.transcript && (
        <p className="error text-[13px]">🎙 falha ao baixar o áudio</p>
      )}
      {!url &&
        !failed &&
        (message.transcript || message.mediaStatus === 'READY') &&
        message.mediaStatus !== 'FAILED' && (
          <p className="muted text-[13px]">🎙 áudio</p>
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
