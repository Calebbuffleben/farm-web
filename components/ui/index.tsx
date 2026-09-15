'use client';

/**
 * Kit mínimo do Farm — sem lib de componentes. Tokens vêm do @theme em
 * globals.css. Tudo aqui é apresentação; regra de negócio fica em lib/.
 */

import type { ReactNode } from 'react';

export type DealStage =
  | 'SONDAGEM'
  | 'NEGOCIACAO'
  | 'FECHAMENTO'
  | 'POS_VENDA'
  | 'SEM_NEGOCIO';
export type DealTemperature = 'HOT' | 'WARM' | 'COOLING' | 'COLD';
export type DealLevel = 'BAIXA' | 'MEDIA' | 'ALTA';

export const STAGE_LABEL: Record<DealStage, string> = {
  SONDAGEM: 'Sondagem',
  NEGOCIACAO: 'Negociação',
  FECHAMENTO: 'Fechamento',
  POS_VENDA: 'Pós-venda',
  SEM_NEGOCIO: 'Sem negócio',
};

export const TEMP_LABEL: Record<DealTemperature, string> = {
  HOT: 'Quente',
  WARM: 'Morno',
  COOLING: 'Esfriando',
  COLD: 'Frio',
};

export const LEVEL_LABEL: Record<DealLevel, string> = {
  BAIXA: 'baixa',
  MEDIA: 'média',
  ALTA: 'alta',
};

export const KIND_LABEL: Record<string, string> = {
  proposta: 'Proposta',
  followup: 'Follow-up',
  logistica: 'Logística',
  ligar: 'Ligar',
  escalar_gestor: 'Escalar ao gestor',
  aguardar: 'Aguardar',
  pos_venda: 'Pós-venda',
};

export const BLOCKER_LABEL: Record<string, string> = {
  preco: 'Preço',
  prazo_pagamento: 'Prazo de pagamento',
  logistica: 'Logística',
  disponibilidade: 'Disponibilidade',
  qualidade: 'Qualidade',
  clima: 'Clima',
  assistencia_tecnica: 'Assistência técnica',
  volume_pedido: 'Volume do pedido',
  cotacao: 'Cotação',
  interesse_produto: 'Interesse em produto',
  mudanca_fornecedor: 'Mudança de fornecedor',
  reclamacao: 'Reclamação',
  visita: 'Visita',
  retorno_cotacao: 'Retorno de cotação',
  outro: 'Outro',
};

export function blockerLabel(subtype: string | null | undefined): string {
  if (!subtype) return '—';
  return BLOCKER_LABEL[subtype] ?? subtype.replace(/_/g, ' ');
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  padded = true,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'rounded-card border border-border bg-surface text-left',
        padded && 'p-5',
        onClick &&
          'w-full transition hover:border-border-strong hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'hot' | 'cooling' | 'danger' | 'accent';
  onClick?: () => void;
  active?: boolean;
}) {
  const toneCls: Record<typeof tone, string> = {
    neutral: 'text-text',
    hot: 'text-hot',
    cooling: 'text-cooling',
    danger: 'text-danger',
    accent: 'text-accent',
  };
  return (
    <Card
      onClick={onClick}
      className={cx('min-w-0', active && 'border-accent/70 bg-surface-2')}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cx('mt-1 text-3xl font-semibold tabular-nums', toneCls[tone])}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </Card>
  );
}

export function Chip({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'info' | 'stage';
  className?: string;
  title?: string;
}) {
  const toneCls: Record<typeof tone, string> = {
    neutral: 'bg-surface-2 text-muted border-border',
    accent: 'bg-accent/15 text-accent border-accent/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    info: 'bg-info/15 text-info border-info/30',
    stage: 'bg-surface-3 text-text border-border-strong',
  };
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4',
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StageChip({ stage, className }: { stage: DealStage; className?: string }) {
  return (
    <Chip tone={stage === 'SEM_NEGOCIO' ? 'neutral' : 'stage'} className={className}>
      {STAGE_LABEL[stage]}
    </Chip>
  );
}

export const TEMP_BG: Record<DealTemperature, string> = {
  HOT: 'bg-hot',
  WARM: 'bg-warm',
  COOLING: 'bg-cooling',
  COLD: 'bg-cold',
};

export const TEMP_TEXT: Record<DealTemperature, string> = {
  HOT: 'text-hot',
  WARM: 'text-warm',
  COOLING: 'text-cooling',
  COLD: 'text-cold',
};

export function TempDot({
  temperature,
  withLabel,
  className,
}: {
  temperature: DealTemperature;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 text-xs', TEMP_TEXT[temperature], className)}
      title={TEMP_LABEL[temperature]}
    >
      <span
        className={cx(
          'inline-block size-2 rounded-full',
          TEMP_BG[temperature],
          temperature === 'HOT' && 'shadow-[0_0_0_3px_rgba(249,115,22,0.25)]',
        )}
      />
      {withLabel && <span className="font-medium">{TEMP_LABEL[temperature]}</span>}
    </span>
  );
}

export function TempBar({
  hot,
  warm,
  cooling,
  cold,
  className,
}: {
  hot: number;
  warm: number;
  cooling: number;
  cold: number;
  className?: string;
}) {
  const total = hot + warm + cooling + cold;
  if (!total) return <div className={cx('h-2 rounded-full bg-surface-3', className)} />;
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? (
      <div
        key={label}
        className={cls}
        style={{ width: `${(n / total) * 100}%` }}
        title={`${label}: ${n}`}
      />
    ) : null;
  return (
    <div className={cx('flex h-2 overflow-hidden rounded-full bg-surface-3', className)}>
      {seg(hot, TEMP_BG.HOT, 'Quente')}
      {seg(warm, TEMP_BG.WARM, 'Morno')}
      {seg(cooling, TEMP_BG.COOLING, 'Esfriando')}
      {seg(cold, TEMP_BG.COLD, 'Frio')}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx(
        'inline-flex rounded-control border border-border bg-surface-2 p-0.5 text-sm',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'rounded-[8px] px-3 py-1 font-medium transition',
              active ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({
  title,
  hint,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-card border border-dashed border-border px-5 py-8 text-center',
        className,
      )}
    >
      <div className="text-sm font-medium text-muted">{title}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal
        className="relative flex h-full w-full flex-col border-l border-border bg-bg shadow-2xl"
        style={{ maxWidth: width }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1 text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-control border border-border px-2.5 py-1 text-sm text-muted hover:text-text"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  activeKey,
  empty,
}: {
  rows: T[];
  columns: Array<{
    key: string;
    header: ReactNode;
    render: (row: T) => ReactNode;
    className?: string;
    align?: 'left' | 'right';
  }>;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  activeKey?: string | null;
  empty?: ReactNode;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  'px-3 py-2 font-medium',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const active = activeKey === key;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  'border-t border-border',
                  onRowClick && 'cursor-pointer hover:bg-surface-2',
                  active && 'bg-surface-2',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      'px-3 py-2.5 align-middle',
                      c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function relativeTime(iso: string | Date | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime();
  const diff = Math.max(0, now - t);
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d`;
  return new Date(t).toLocaleDateString('pt-BR');
}
