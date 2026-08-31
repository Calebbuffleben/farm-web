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
import { fetchMediaUrl } from '@/lib/api';
import { useAudioRecorder } from '@/lib/use-audio-recorder';
import { useTwilioDevice } from '@/lib/use-twilio-device';

const POLL_MS = 5000;

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    const m = params.get('m');
    if (c) setSelectedId(c);
    if (m) setHighlightId(m);
  }, []);

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: selected ? 'minmax(260px, 340px) 1fr' : '1fr',
        gap: 16,
        height: 'calc(100dvh - 110px)',
      }}
    >
      <div
        className="card"
        style={{
          padding: 0,
          overflowY: 'auto',
          display: selected ? undefined : 'block',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <strong>Conversas</strong>
        </div>
        {!loaded && <p className="muted" style={{ padding: 16 }}>Carregando…</p>}
        {loaded && listError && (
          <p className="error" style={{ padding: 16, fontSize: 14 }}>{listError}</p>
        )}
        {loaded && !listError && conversations.length === 0 && (
          <p className="muted" style={{ padding: 16, fontSize: 14 }}>
            Nenhuma conversa ainda. WhatsApp, ligação ou e-mail do produtor
            aparecem aqui.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: c.id === selectedId ? 'var(--surface-2)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>
                {c.producer?.name ?? c.producerPhone}
              </strong>
              <span
                className="muted"
                style={{
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ChannelBadge kind={c.channelKind} />
                {c.lastMessageAt ? formatTime(c.lastMessageAt) : ''}
              </span>
            </div>
            <div
              className="muted"
              style={{
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}
            >
              {previewOf(c)}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ChatPane
          key={selected.id}
          conversation={selected}
          highlightMessageId={highlightId}
          onClose={() => {
            setSelectedId(null);
            setHighlightId(null);
          }}
          onChanged={refresh}
        />
      )}
    </div>
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

function channelBadgeLabel(
  kind: ConversationSummary['channelKind'] | undefined,
): string {
  if (kind === 'VOICE') return 'VOZ';
  if (kind === 'EMAIL') return 'E-MAIL';
  return 'WABA';
}

function ChannelBadge({ kind }: { kind: ConversationSummary['channelKind'] | undefined }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '1px 6px',
        color: 'var(--text-muted)',
      }}
    >
      {channelBadgeLabel(kind)}
    </span>
  );
}

function ChatPane({
  conversation,
  highlightMessageId,
  onClose,
  onChanged,
}: {
  conversation: ConversationSummary;
  highlightMessageId: string | null;
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
  const needsSubject = isEmail && !conversation.emailSubject;
  const fone = useTwilioDevice(isVoice && foneOn);

  const refresh = useCallback(() => {
    listMessages(conversation.id)
      .then((rows) => {
        setMessages(rows);
        setSendError(null);
      })
      .catch((err) => {
        setSendError(
          err instanceof Error ? err.message : 'Não deu para carregar as mensagens',
        );
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
      document.getElementById(`msg-${highlightMessageId}`)?.scrollIntoView({
        block: 'center',
      });
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
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 18,
          }}
          aria-label="Fechar conversa"
        >
          ←
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{conversation.producer?.name ?? conversation.producerPhone}</strong>
            <ChannelBadge kind={conversation.channelKind} />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {conversation.producerPhone} · via {conversation.wabaNumber.displayNumber}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            highlight={m.id === highlightMessageId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        {sendError && (
          <p className="error" style={{ marginBottom: 8, fontSize: 13 }}>{sendError}</p>
        )}
        {isVoice ? (
          <div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              A transcrição entra quando a Twilio envia a gravação. Não há
              texto neste canal.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn" onClick={onCall} disabled={calling}>
                {calling ? 'Ligando…' : 'Ligar'}
              </button>
              <button
                className="btn"
                onClick={() => setFoneOn((on) => !on)}
                style={{
                  background: foneOn ? 'var(--surface-2)' : undefined,
                }}
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
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                {fone.status === 'ready' && 'Fone pronto — toques também no navegador. Atenda aqui ou no celular.'}
                {fone.status === 'ringing' && 'Ligação no navegador — Atender ou Encerrar.'}
                {fone.status === 'open' && 'Em chamada.'}
                {fone.status === 'idle' && 'Ativando fone…'}
              </p>
            )}
            {fone.error && (
              <p className="error" style={{ fontSize: 13, marginTop: 8 }}>{fone.error}</p>
            )}
          </div>
        ) : (
          <>
        {recorder.error && (
          <p className="error" style={{ marginBottom: 8, fontSize: 13 }}>{recorder.error}</p>
        )}
        {recorder.recording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--danger)', fontSize: 14 }}>
              ● Gravando {Math.floor(recorder.elapsedMs / 1000)}s
            </span>
            <button className="btn" onClick={onStopRecording} disabled={sending}>
              Enviar
            </button>
            <button
              onClick={recorder.cancel}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: 10,
                padding: '10px 18px',
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {needsSubject && (
              <input
                className="input"
                placeholder="Assunto"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                disabled={sending}
              />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
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
            {draft.trim() || isEmail ? (
              <button
                className="btn"
                onClick={onSendText}
                disabled={sending || !draft.trim() || (needsSubject && !subjectDraft.trim())}
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
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  highlight,
}: {
  message: InboxMessage;
  highlight?: boolean;
}) {
  const mine = message.direction === 'OUT';
  return (
    <div
      id={`msg-${message.id}`}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '75%',
        background: mine ? 'var(--surface-2)' : 'var(--surface)',
        border: highlight ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 12,
        padding: '8px 12px',
      }}
    >
      {message.type === 'TEXT' && (
        <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{message.body}</p>
      )}
      {message.type === 'AUDIO' && <AudioMessage message={message} />}
      {message.type !== 'TEXT' && message.type !== 'AUDIO' && (
        <p className="muted" style={{ fontSize: 13 }}>
          [{message.type.toLowerCase()}]
          {message.mediaStatus === 'PENDING_MEDIA' && ' — baixando…'}
        </p>
      )}
      <span className="muted" style={{ fontSize: 11, display: 'block', textAlign: 'right', marginTop: 4 }}>
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
        <p className="muted" style={{ fontSize: 13 }}>🎙 áudio — baixando…</p>
      )}
      {message.mediaStatus === 'FAILED' && (
        <p className="error" style={{ fontSize: 13 }}>🎙 falha ao baixar o áudio</p>
      )}
      {url && <audio controls src={url} style={{ maxWidth: '100%' }} />}
      {failed && <p className="error" style={{ fontSize: 13 }}>Falha ao carregar áudio</p>}
      {message.transcript && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
          “{message.transcript}”
        </p>
      )}
      {message.coachNote && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface-2)',
            fontSize: 13,
          }}
        >
          <span
            className="muted"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.04,
              color:
                message.coachTone === 'alerta'
                  ? 'var(--danger)'
                  : message.coachTone === 'oportunidade'
                    ? 'var(--accent)'
                    : undefined,
            }}
          >
            COPILOT
            {message.coachTone && message.coachTone !== 'neutro'
              ? ` · ${message.coachTone}`
              : ''}
          </span>
          <p style={{ marginTop: 4 }}>{message.coachNote}</p>
        </div>
      )}
    </div>
  );
}
