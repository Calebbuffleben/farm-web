'use client';

/**
 * Kit mínimo do Farm — sem lib de componentes. Tokens vêm do @theme em
 * globals.css. Tudo aqui é apresentação; regra de negócio fica em lib/.
 */

import { useEffect, useRef, type ReactNode } from 'react';

export type IconName =
  | 'inbox'
  | 'dashboard'
  | 'settings'
  | 'logout'
  | 'chevron'
  | 'arrow'
  | 'spark'
  | 'filter'
  | 'search'
  | 'send'
  | 'mic'
  | 'close';

export function Icon({
  name,
  className = 'size-4',
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    inbox: <><path d="M4 4h16v14H4z" /><path d="M4 14h4l2 3h4l2-3h4" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.4.26.7.62.6 1.1v.1h1v4h-.1a1.7 1.7 0 0 0-1.5.8Z" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" /></>,
    filter: <path d="M4 5h16M7 12h10m-7 7h4" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export function BrandMark({
  className = 'size-9',
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      className={cx(
        'relative grid shrink-0 place-items-center overflow-hidden',
        inverted ? 'rounded-xl bg-accent text-accent-ink' : 'rounded-xl bg-accent text-accent-ink',
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-[68%]" fill="none" aria-hidden>
        <path d="M7 24V9.5C7 8.12 8.12 7 9.5 7H23" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M8 16h10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18.5 5.5c0 3.3-1.8 5.5-5.5 5.5 0-3.4 1.9-5.5 5.5-5.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

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
        'rounded-card border border-border bg-surface text-left shadow-[0_1px_0_rgba(26,23,18,0.04)]',
        padded && 'p-5',
        onClick &&
          'w-full transition duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
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
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{subtitle}</p>}
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
      className={cx('relative min-w-0 overflow-hidden !p-5', active && 'border-accent/50 bg-surface-2')}
    >
      <div className={cx('absolute inset-y-3 left-0 w-[3px]', tone === 'neutral' ? 'bg-border-strong' : tone === 'accent' ? 'bg-accent' : tone === 'hot' ? 'bg-hot' : tone === 'danger' ? 'bg-danger' : 'bg-cooling')} />
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={cx('mt-3 font-mono text-[40px] font-medium leading-none tracking-[-0.04em]', toneCls[tone])}>
        {value}
      </div>
      {hint && <div className="mt-2 max-w-[16rem] text-[12px] leading-snug text-faint">{hint}</div>}
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
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-[18px]',
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
          temperature === 'HOT' && 'shadow-[0_0_0_3px_rgba(255,122,89,0.28)]',
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
    <div
      className={cx('flex h-2 overflow-hidden rounded-full bg-surface-3', className)}
      role="img"
      aria-label={`Carteira: ${hot} quente, ${warm} morno, ${cooling} esfriando e ${cold} frio`}
    >
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
        'inline-flex border border-border bg-surface-2 p-0.5 text-sm',
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
              'px-3 py-1 font-semibold transition',
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
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal
        aria-label={typeof title === 'string' ? title : 'Detalhes'}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col border-l border-border bg-surface shadow-2xl"
        style={{ maxWidth: width }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1 font-display text-xl tracking-[-0.03em]">{title}</div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center border border-border text-muted transition hover:bg-surface-2 hover:text-text"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
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
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2/80 text-[10px] uppercase tracking-[0.14em] text-muted">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  'px-4 py-3 font-semibold',
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
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                className={cx(
                  'border-t border-border transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-2/65',
                  active && 'bg-surface-2',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      'px-4 py-3 align-middle',
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
