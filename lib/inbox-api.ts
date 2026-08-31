import { api, apiUpload } from './api';

export interface ConversationSummary {
  id: string;
  producerPhone: string;
  producer: { id: string; name: string } | null;
  wabaNumber: { id: string; displayNumber: string };
  channelKind: 'WABA' | 'VOICE' | 'EMAIL';
  emailSubject?: string | null;
  lastMessageAt: string | null;
  lastMessage: {
    id: string;
    type: string;
    body: string | null;
    direction: 'IN' | 'OUT';
    sentAt: string;
    transcript: string | null;
  } | null;
}

export interface InboxMessage {
  id: string;
  wamid: string;
  direction: 'IN' | 'OUT';
  type: 'TEXT' | 'AUDIO' | 'IMAGE' | 'DOCUMENT' | 'OTHER';
  body: string | null;
  transcript: string | null;
  coachNote?: string | null;
  coachTone?: string | null;
  mediaStatus: 'NONE' | 'PENDING_MEDIA' | 'READY' | 'FAILED';
  mediaAssetId: string | null;
  senderUserId: string | null;
  sentAt: string;
}

export const listConversations = () =>
  api<ConversationSummary[]>('/inbox/conversations');

export const listMessages = (conversationId: string) =>
  api<InboxMessage[]>(`/inbox/conversations/${conversationId}/messages`);

export const sendText = (
  conversationId: string,
  text: string,
  subject?: string,
) =>
  api<InboxMessage>(`/inbox/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      ...(subject ? { subject } : {}),
    }),
  });

export const sendAudio = (conversationId: string, blob: Blob, filename: string) => {
  const form = new FormData();
  form.append('file', blob, filename);
  return apiUpload<InboxMessage>(`/inbox/conversations/${conversationId}/audio`, form);
};

export const startCall = (conversationId: string) =>
  api<{ ok: true; callSid: string }>(`/inbox/conversations/${conversationId}/call`, {
    method: 'POST',
  });

export const fetchVoiceToken = () =>
  api<{ token: string; expiresAt: string; outgoing: boolean }>('/voice/token', {
    method: 'POST',
  });

// --- Settings (WABA + carteira) ---

export interface WabaNumberInfo {
  id: string;
  phoneNumberId: string;
  displayNumber: string;
  displayName: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
}

export interface WabaAccountInfo {
  id: string;
  provider: string;
  status: string;
  webhookPath: string;
  publicOrigin?: string | null;
  numbers: WabaNumberInfo[];
}

export const listWabaAccounts = () => api<WabaAccountInfo[]>('/waba/accounts');

export const createWabaAccount = (input: {
  apiToken: string;
  webhookSecret?: string;
  provider?: 'BSP_360DIALOG' | 'META_DIRECT';
}) =>
  api<{ id: string; webhookPath: string }>('/waba/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const addWabaNumber = (
  accountId: string,
  input: { phoneNumberId: string; displayNumber: string; displayName?: string },
) =>
  api<WabaNumberInfo>(`/waba/accounts/${accountId}/numbers`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const assignWabaNumber = (numberId: string, assignedUserId: string | null) =>
  api<WabaNumberInfo>(`/waba/numbers/${numberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedUserId }),
  });

export interface VoiceEndpointInfo {
  id: string;
  address: string;
  displayAddress: string;
  assignedUser: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

export interface VoiceAccountInfo {
  id: string;
  status: string;
  webhookPath: string;
  recordingPath: string;
  publicOrigin?: string | null;
  softphone?: { apiKey: boolean; twimlApp: boolean };
  endpoints: VoiceEndpointInfo[];
}

export const listVoiceAccounts = () => api<VoiceAccountInfo[]>('/voice/accounts');

export const createVoiceAccount = (input: {
  accountSid: string;
  authToken: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  twimlAppSid?: string;
}) =>
  api<{ id: string; webhookPath: string }>('/voice/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const patchVoiceAccount = (
  accountId: string,
  input: { apiKeySid?: string; apiKeySecret?: string; twimlAppSid?: string },
) =>
  api<{ id: string; softphone: { apiKey: boolean; twimlApp: boolean } }>(
    `/voice/accounts/${accountId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );

export const addVoiceNumber = (
  accountId: string,
  input: { address: string; assignedUserId?: string; rtvPhone?: string },
) =>
  api<VoiceEndpointInfo>(`/voice/accounts/${accountId}/numbers`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const assignVoiceNumber = (
  numberId: string,
  input: { assignedUserId: string | null; rtvPhone?: string },
) =>
  api<VoiceEndpointInfo>(`/voice/numbers/${numberId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export interface EmailEndpointInfo {
  id: string;
  address: string;
  displayAddress: string;
  assignedUser: { id: string; name: string | null; email: string } | null;
}

export interface EmailAccountInfo {
  id: string;
  status: string;
  webhookPath: string;
  publicOrigin?: string | null;
  endpoints: EmailEndpointInfo[];
}

export const listEmailAccounts = () => api<EmailAccountInfo[]>('/email/accounts');

export const createEmailAccount = (input: {
  apiKey: string;
  domain: string;
  signingKey: string;
  region?: 'us' | 'eu';
}) =>
  api<{ id: string; webhookPath: string }>('/email/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const addEmailAddress = (
  accountId: string,
  input: { address: string; assignedUserId?: string },
) =>
  api<EmailEndpointInfo>(`/email/accounts/${accountId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const assignEmailAddress = (
  endpointId: string,
  assignedUserId: string | null,
) =>
  api<EmailEndpointInfo>(`/email/addresses/${endpointId}`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedUserId }),
  });

export interface Member {
  id: string;
  userId?: string;
  role: string;
  name?: string | null;
  email?: string;
  phone?: string | null;
  user?: { id: string; name: string | null; email: string; phone?: string | null };
}

export const listMembers = () => api<Member[]>('/members');

export interface CreatedInvite {
  id: string;
  email: string;
  role: string;
  token: string;
}

export const createInvite = (email: string, role = 'MEMBER') =>
  api<CreatedInvite>('/invites', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });

export const changeMemberRole = (membershipId: string, role: string) =>
  api<Member>(`/members/${membershipId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const removeMember = (membershipId: string) =>
  api(`/members/${membershipId}`, { method: 'DELETE' });

export const listInvites = () =>
  api<Array<{ id: string; email: string; role: string; status: string }>>('/invites');

export const revokeInvite = (id: string) =>
  api(`/invites/${id}`, { method: 'DELETE' });

export interface ImportSummary {
  rows: number;
  producers: number;
  phones: number;
  emails: number;
  farms: number;
  cropSeasons: number;
  errors: string[];
}

export function importCarteira(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiUpload<ImportSummary>('/catalog/import', form);
}

export interface UnknownItem {
  id: string;
  spanText: string | null;
  candidates: { farmId: string; confidence: number }[] | null;
  createdAt: string;
  message: {
    id: string;
    body: string | null;
    transcript: string | null;
    sentAt: string;
    conversation: {
      id: string;
      producerPhone: string;
      producer: { name: string } | null;
    };
  };
}

export const listUnknowns = () => api<UnknownItem[]>('/catalog/unknowns');

export const resolveUnknown = (id: string, farmId: string | null) =>
  api(`/catalog/unknowns/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ farmId }),
  });

export interface ProducerFarm {
  id: string;
  name: string;
  region: string | null;
}

export interface ProducerRow {
  id: string;
  name: string;
  farms: ProducerFarm[];
}

export const listProducers = () => api<ProducerRow[]>('/catalog/producers');

export interface BillingSnapshot {
  plan: string;
  maxUsers: number;
  status: string;
  memberCount: number;
  pendingInvites: number;
  seatsRemaining: number;
  entitled: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  planLimits: Record<string, number>;
}

export const fetchBilling = () => api<BillingSnapshot>('/billing/subscription');

export const openBillingPortal = () =>
  api<{ url: string }>('/billing/portal-session', { method: 'POST' });

export interface ConsentRow {
  id: string;
  purpose: 'CONVERSATION_ANALYSIS' | 'MEDIA_RETENTION';
  source: string;
  grantedAt: string;
  revokedAt: string | null;
  producer: { id: string; name: string };
}

export const listConsents = () => api<ConsentRow[]>('/consent');

export const grantConsent = (
  producerId: string,
  purpose: ConsentRow['purpose'],
) =>
  api(`/consent/${producerId}/grant`, {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });

export const revokeConsent = (
  producerId: string,
  purpose: ConsentRow['purpose'],
) =>
  api(`/consent/${producerId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
