import { api } from './api';

export interface FactCard {
  id: string;
  kind: string;
  subtype: string;
  severity: string;
  headline: string;
  moneyHint: string | null;
  dueHintText: string | null;
  dueAt: string | null;
  occurredAt: string;
  farmId: string | null;
  farmName: string | null;
  region: string | null;
  crop: string | null;
  productKey: string | null;
  rtvUserId: string | null;
  rtvName: string | null;
  producerName: string | null;
  evidenceMessageId: string;
  evidenceSpan: string | null;
  conversationId: string;
}

export interface ObjectionGroup {
  crop: string;
  region: string;
  current: number;
  previous: number;
  delta: number;
  growing: boolean;
  items: FactCard[];
}

export interface RtvHelpItem {
  rtvUserId: string | null;
  rtvName: string;
  critical: number;
  warning: number;
  overdue: number;
  competitor: number;
  objections: number;
  score: number;
  items: FactCard[];
}

// --- Centro de Comando -----------------------------------------------------

export type DealStage =
  | 'SONDAGEM'
  | 'NEGOCIACAO'
  | 'FECHAMENTO'
  | 'POS_VENDA'
  | 'SEM_NEGOCIO';
export type DealTemperature = 'HOT' | 'WARM' | 'COOLING' | 'COLD';
export type DealLevel = 'BAIXA' | 'MEDIA' | 'ALTA';

/** Um negócio (1 por conversa) como o backend devolve no pipeline/atenção. */
export interface DealCard {
  conversationId: string;
  producerName: string | null;
  producerPhone: string | null;
  farmNames: string[];
  rtvUserId: string | null;
  rtvName: string | null;
  stage: DealStage;
  temperature: DealTemperature;
  intent: DealLevel;
  urgency: DealLevel;
  contextSummary: string;
  painPoint: string | null;
  nextAction: string;
  nextActionKind: string;
  nextActionDueAt: string | null;
  blockerSubtype: string | null;
  products: string[];
  /** Pistas de valor em texto — R$ só com ERP. */
  moneyHints: string[];
  lastMessageAt: string | null;
  lastDirection: 'IN' | 'OUT' | null;
  unanswered: boolean;
  updatedAt: string;
}

export type AttentionReason =
  | 'hot_with_pain'
  | 'cooling_late_stage'
  | 'unanswered'
  | 'next_action_overdue'
  | 'followup_overdue';

export interface AttentionItem extends DealCard {
  reasons: AttentionReason[];
  priority: number;
}

export interface RadarRow {
  rtvUserId: string | null;
  rtvName: string;
  deals: number;
  hot: number;
  warm: number;
  cooling: number;
  cold: number;
  complaints: number;
  overdueFollowups: number;
  unanswered: number;
  score: number;
}

export interface Pipeline {
  open: number;
  byStage: { stage: DealStage; count: number; deals: DealCard[] }[];
  byBlocker: {
    blockerSubtype: string;
    count: number;
    deals: DealCard[];
    moneyHints: string[];
  }[];
}

export interface CommandSummary {
  deals: number;
  hot: number;
  cooling: number;
  unanswered: number;
  complaints: number;
  overdueFollowups: number;
}

export interface DealDetail extends DealCard {
  stageConfidence: number;
  evidenceMessageId: string;
  facts: FactCard[];
}

export interface DashboardHome {
  window: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    days: number;
  };
  unknownPending: number;
  summary: CommandSummary;
  attention: AttentionItem[];
  radar: RadarRow[];
  pipeline: Pipeline;
  cuts: {
    rtvs: { id: string; name: string }[];
    farms: { id: string; name: string }[];
    regions: string[];
    crops: string[];
    products: string[];
  };
  questions: {
    moneyRisk: { count: number; items: FactCard[] };
    objections: { count: number; growing: number; groups: ObjectionGroup[] };
    followups: { count: number; overdue: number; items: FactCard[] };
    competitor: { count: number; items: FactCard[] };
    rtvHelp: { count: number; items: RtvHelpItem[] };
  };
}

export interface FactDetail extends Omit<FactCard, 'evidenceMessageId' | 'conversationId'> {
  status: string;
  channelKind: 'WABA' | 'VOICE' | 'EMAIL' | 'WA_SESSION';
  evidence: {
    messageId: string;
    conversationId: string;
    type: string;
    body: string | null;
    transcript: string | null;
    sentAt: string;
    mediaAssetId: string | null;
  };
  farmState: {
    farmId: string;
    name: string;
    region: string | null;
    openFacts: unknown;
    lastFactAt: string | null;
  } | null;
}

export interface HomeQuery {
  days?: number;
  rtvUserId?: string;
  farmId?: string;
  crop?: string;
  region?: string;
  productKey?: string;
}

export function fetchDashboardHome(query: HomeQuery = {}) {
  const params = new URLSearchParams();
  if (query.days) params.set('days', String(query.days));
  if (query.rtvUserId) params.set('rtvUserId', query.rtvUserId);
  if (query.farmId) params.set('farmId', query.farmId);
  if (query.crop) params.set('crop', query.crop);
  if (query.region) params.set('region', query.region);
  if (query.productKey) params.set('productKey', query.productKey);
  const qs = params.toString();
  return api<DashboardHome>(`/dashboard/home${qs ? `?${qs}` : ''}`);
}

export const fetchFact = (id: string) => api<FactDetail>(`/dashboard/facts/${id}`);

export const fetchDeal = (conversationId: string) =>
  api<DealDetail>(`/dashboard/deals/${encodeURIComponent(conversationId)}`);

export const patchFactStatus = (id: string, status: 'OPEN' | 'RESOLVED' | 'DISMISSED') =>
  api<{ id: string; status: string }>(`/dashboard/facts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const sendDiscountReply = (id: string, text: string) =>
  api<{ ok: true; sent: boolean; channel: 'WABA' | 'VOICE' | 'EMAIL' | 'WA_SESSION' }>(
    `/dashboard/facts/${id}/discount-reply`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  );
