'use client';

/**
 * SPIKE — gravação de áudio longa em PWA no iOS.
 *
 * Objetivo: medir o comportamento do MediaRecorder no Safari/iOS quando:
 *   1. a tela bloqueia durante a gravação;
 *   2. o usuário troca de app (background);
 *   3. a gravação passa de 3+ minutos.
 *
 * Protocolo (rodar num iPhone REAL, via HTTPS ou localhost):
 *   - Iniciar gravação falando continuamente (ou com áudio tocando perto);
 *   - Bloquear a tela por 2 minutos, desbloquear, parar e ouvir o playback;
 *   - Repetir trocando para outro app em vez de bloquear;
 *   - Conferir no log: chunks continuaram chegando? houve pause/stop?
 *
 * O veredito vai em farm/docs/spike-ios-audio.md.
 */

import { useEffect, useRef, useState } from 'react';
import { pickAudioMimeType } from '@/lib/use-audio-recorder';

interface LogEntry {
  at: string;
  event: string;
}

export default function AudioSpikePage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [mimeType, setMimeType] = useState<string>('');
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastChunkAtRef = useRef(0);

  function addLog(event: string) {
    setLog((prev) => [
      ...prev,
      { at: new Date().toLocaleTimeString('pt-BR', { hour12: false }), event },
    ]);
  }

  useEffect(() => {
    const onVisibility = () =>
      addLog(`visibilitychange → ${document.visibilityState}`);
    const onPageHide = () => addLog('pagehide');
    const onFreeze = () => addLog('freeze');
    const onResume = () => addLog('resume');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('freeze', onFreeze);
    document.addEventListener('resume', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('freeze', onFreeze);
      document.removeEventListener('resume', onResume);
    };
  }, []);

  async function start() {
    setLog([]);
    setChunks(0);
    setBytes(0);
    setElapsed(0);
    setPlaybackUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chosen = pickAudioMimeType();
      setMimeType(chosen ?? '(default do browser)');
      addLog(`getUserMedia ok | mimeType=${chosen ?? 'default'}`);

      const recorder = new MediaRecorder(stream, chosen ? { mimeType: chosen } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setChunks((c) => c + 1);
          setBytes((b) => b + e.data.size);
          const now = Date.now();
          // gaps > 3s entre chunks = suspensão silenciosa (o dado que interessa)
          if (lastChunkAtRef.current && now - lastChunkAtRef.current > 3000) {
            addLog(
              `⚠️ GAP de ${((now - lastChunkAtRef.current) / 1000).toFixed(1)}s entre chunks`,
            );
          }
          lastChunkAtRef.current = now;
        }
      };
      recorder.onpause = () => addLog('⚠️ recorder PAUSE (não solicitado?)');
      recorder.onresume = () => addLog('recorder resume');
      recorder.onerror = (e) => addLog(`⚠️ recorder ERROR: ${String(e)}`);
      recorder.onstop = () => addLog('recorder stop');
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => addLog('⚠️ audio track ENDED (SO derrubou o mic)');
        track.onmute = () => addLog('⚠️ audio track MUTE');
        track.onunmute = () => addLog('audio track unmute');
      });

      recorder.start(1000);
      recorderRef.current = recorder;
      lastChunkAtRef.current = Date.now();
      setRecording(true);
      addLog('gravação iniciada (timeslice 1s)');
      const startedAt = Date.now();
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
        500,
      );
    } catch (err) {
      addLog(`⚠️ getUserMedia falhou: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (timerRef.current) clearInterval(timerRef.current);
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      setPlaybackUrl(URL.createObjectURL(blob));
      addLog(`final: ${chunksRef.current.length} chunks, ${(blob.size / 1024).toFixed(0)} KB`);
      setRecording(false);
    };
    recorder.stop();
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Spike — áudio longo em PWA (iOS)</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        Grave, bloqueie a tela por 2 min, desbloqueie, pare e confira o log e o
        playback. Rodar num iPhone real (Safari) — o resultado decide o UX de
        gravação do inbox.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
          {!recording ? (
            <button className="btn" onClick={start}>Iniciar gravação</button>
          ) : (
            <button className="btn" onClick={stop} style={{ background: 'var(--danger)' }}>
              Parar
            </button>
          )}
          <span style={{ fontSize: 14 }}>
            {recording ? `● ${elapsed}s` : 'parado'}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          mimeType: {mimeType || '—'} · chunks: {chunks} · {(bytes / 1024).toFixed(0)} KB
        </p>
        {playbackUrl && (
          <audio controls src={playbackUrl} style={{ width: '100%', marginTop: 12 }} />
        )}
      </div>

      <div className="card" style={{ fontFamily: 'monospace', fontSize: 12, maxHeight: 320, overflowY: 'auto' }}>
        {log.length === 0 && <span className="muted">log vazio</span>}
        {log.map((entry, i) => (
          <div key={i}>
            [{entry.at}] {entry.event}
          </div>
        ))}
      </div>
    </main>
  );
}
