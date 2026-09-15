import { api } from './api';

/** Espelho de WaSessionState do backend. */
export interface WaSessionState {
  accountId: string;
  endpointId: string;
  status: 'NEVER' | 'PENDING' | 'ACTIVE' | 'DISABLED';
  phone: string | null;
  connectedAt: string | null;
  todaySent: number;
  todayCap: number;
  rampDay: number;
  publicUrl: boolean;
  vendorReady: boolean;
  assignedUser?: { id: string; name: string | null; email: string } | null;
}

export interface ConnectResult extends WaSessionState {
  pairingCode: string | null;
  qrBase64: string | null;
}

export const fetchMySession = () => api<WaSessionState>('/wa-session/me');

export const listSessions = () => api<WaSessionState[]>('/wa-session/instances');

export const connectSession = (input: { phone?: string; accepted: boolean }) =>
  api<ConnectResult>('/wa-session/instances', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const pollSession = (accountId: string, wantQr: boolean) =>
  api<WaSessionState & { qrBase64: string | null }>(
    `/wa-session/instances/${accountId}${wantQr ? '?qr=1' : ''}`,
  );

export const requestPairingCode = (accountId: string, phone: string) =>
  api<{ code: string }>(`/wa-session/instances/${accountId}/pairing-code`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const logoutSession = (accountId: string) =>
  api<{ ok: true }>(`/wa-session/instances/${accountId}/logout`, { method: 'POST' });

export const reportEligibility = (conversationId: string) =>
  api<{ eligible: boolean; reason: string | null }>(
    `/wa-session/conversations/${conversationId}/report-eligibility`,
  );

export const sendReport = (conversationId: string) =>
  api<{ queued: boolean; scheduledFor: string }>(
    `/wa-session/conversations/${conversationId}/report`,
    { method: 'POST' },
  );

export function sessionStatusLabel(s: WaSessionState['status']): string {
  if (s === 'ACTIVE') return 'conectado';
  if (s === 'PENDING') return 'aguardando pareamento';
  if (s === 'DISABLED') return 'desconectado';
  return 'nunca conectou';
}
