'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SoftphoneStatus = 'idle' | 'ready' | 'ringing' | 'open' | 'error';

type TwilioCall = {
  accept: () => void;
  disconnect: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type TwilioDevice = {
  register: () => Promise<void>;
  destroy: () => void;
  updateToken: (token: string) => void;
  connect: (opts: { params: Record<string, string> }) => Promise<TwilioCall> | TwilioCall;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

/**
 * Twilio Voice JS no inbox. Não é WebSocket PCM do Meet — o Device da Twilio
 * atende/disca; a gravação continua no TwiML Dial.
 */
export function useTwilioDevice(enabled: boolean) {
  const deviceRef = useRef<TwilioDevice | null>(null);
  const callRef = useRef<TwilioCall | null>(null);
  const [status, setStatus] = useState<SoftphoneStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState(false);

  const teardown = useCallback(() => {
    try {
      callRef.current?.disconnect();
    } catch {
      /* already down */
    }
    callRef.current = null;
    try {
      deviceRef.current?.destroy();
    } catch {
      /* already down */
    }
    deviceRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      teardown();
      setStatus('idle');
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const { fetchVoiceToken } = await import('./inbox-api');
        const minted = await fetchVoiceToken();
        const { Device } = await import('@twilio/voice-sdk');
        if (cancelled) return;
        const device = new Device(minted.token, { logLevel: 'error' }) as unknown as TwilioDevice;
        device.on('error', (...args: unknown[]) => {
          const err = args[0];
          setError(err instanceof Error ? err.message : 'Falha no softphone');
          setStatus('error');
        });
        device.on('tokenWillExpire', () => {
          void fetchVoiceToken()
            .then((next) => {
              device.updateToken(next.token);
              setOutgoing(next.outgoing);
            })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Falha ao renovar o fone');
            });
        });
        device.on('incoming', (...args: unknown[]) => {
          const incoming = args[0] as TwilioCall;
          incoming.on('accept', () => setStatus('open'));
          incoming.on('disconnect', () => setStatus('ready'));
          callRef.current = incoming;
          setStatus('ringing');
        });
        await device.register();
        if (cancelled) {
          device.destroy();
          return;
        }
        deviceRef.current = device;
        setOutgoing(minted.outgoing);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha no softphone');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, teardown]);

  const connect = useCallback(async (peer: string) => {
    const device = deviceRef.current;
    if (!device) throw new Error('Softphone inativo');
    const call = await device.connect({ params: { peer } });
    call.on('accept', () => setStatus('open'));
    call.on('disconnect', () => setStatus('ready'));
    callRef.current = call;
    setStatus('open');
  }, []);

  const acceptIncoming = useCallback(() => {
    callRef.current?.accept();
  }, []);

  const hangup = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    setStatus(deviceRef.current ? 'ready' : 'idle');
  }, []);

  return { status, error, outgoing, connect, acceptIncoming, hangup };
}
