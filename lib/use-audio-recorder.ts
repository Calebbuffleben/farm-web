'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Gravação de áudio via MediaRecorder.
 * Preferência de container: mp4/AAC (Safari/iOS — aceito pela Cloud API),
 * depois ogg/opus (Firefox), depois webm/opus (Chrome; a Meta pode recusar —
 * transcodificação server-side fica fora do ano 1, piloto usa iPhone).
 */
const MIME_CANDIDATES = [
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
];

export function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

export interface AudioRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const recordingRef = useRef(false);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    void lock?.release().catch(() => undefined);
  }, []);

  const requestWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    try {
      wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch {
      // Simulator/Safari sem permissão: gravação segue sem lock.
    }
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && recordingRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [releaseWakeLock, requestWakeLock]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000); // timeslice: preserva chunks se a aba for morta
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recordingRef.current = true;
      setRecording(true);
      void requestWakeLock();
      timerRef.current = setInterval(
        () => setElapsedMs(Date.now() - startedAtRef.current),
        250,
      );
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Permissão de microfone negada'
          : 'Não foi possível iniciar a gravação',
      );
    }
  }, [requestWakeLock]);

  const stop = useCallback((): Promise<AudioRecording | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        releaseWakeLock();
        recordingRef.current = false;
        setRecording(false);
        resolve(null);
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      const durationMs = Date.now() - startedAtRef.current;
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        releaseWakeLock();
        recordingRef.current = false;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecording(false);
        resolve(blob.size > 0 ? { blob, mimeType, durationMs } : null);
      };
      recorder.stop();
    });
  }, [releaseWakeLock]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        releaseWakeLock();
        recordingRef.current = false;
      };
      recorder.stop();
    } else {
      releaseWakeLock();
      recordingRef.current = false;
    }
    chunksRef.current = [];
    setRecording(false);
  }, [releaseWakeLock]);

  return { recording, elapsedMs, error, start, stop, cancel };
}
