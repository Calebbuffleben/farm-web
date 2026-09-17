'use client';

import { useState } from 'react';
import type { DashboardHome, FactCard } from '@/lib/dashboard-api';
import { Card, cx, Empty, SectionHeader } from '@/components/ui';
import { FactRow } from './deal-drawer';

type QuestionKey = 'moneyRisk' | 'objections' | 'followups' | 'competitor' | 'rtvHelp';

const QUESTIONS: { key: QuestionKey; title: string }[] = [
  { key: 'moneyRisk', title: 'Que dinheiro está em risco?' },
  { key: 'objections', title: 'Quais objeções crescem, por cultura e região?' },
  { key: 'followups', title: 'Que follow-ups prometidos vencem?' },
  { key: 'competitor', title: 'Onde o concorrente apareceu?' },
  { key: 'rtvHelp', title: 'Qual RTV precisa de ajuda?' },
];

/** Sinais — as 5 perguntas originais, recolhíveis, alimentadas por fatos. */
export function Signals({
  home,
  onOpenFact,
}: {
  home: DashboardHome;
  onOpenFact: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<QuestionKey | null>(null);

  return (
    <section className="reveal">
      <SectionHeader
        title="Perguntas de gestão"
        subtitle="Respostas objetivas para as cinco perguntas que orientam a rotina do gestor."
        right={
          <button className="btn-ghost !py-1 text-xs" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? 'Mostrar' : 'Recolher'}
          </button>
        }
      />
      {!collapsed && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {QUESTIONS.map((q) => {
              const s = summaryOf(home, q.key);
              const active = open === q.key;
              return (
                <Card
                  key={q.key}
                  onClick={() => setOpen(active ? null : q.key)}
                  className={cx('!p-4', active && 'border-copper/60 bg-[#fffdf8]')}
                >
                  <p className="font-display text-[15px] leading-snug tracking-[-0.02em] text-text">{q.title}</p>
                  <p className="mt-3 font-mono text-[28px] font-medium tabular-nums text-copper">{s.value}</p>
                  {s.hint && <p className="mt-0.5 text-[11px] text-faint">{s.hint}</p>}
                </Card>
              );
            })}
          </div>
          {open && (
            <div className="mt-3">
              <QuestionBody home={home} question={open} onOpenFact={onOpenFact} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function summaryOf(home: DashboardHome, key: QuestionKey): { value: number; hint?: string } {
  const q = home.questions;
  if (key === 'moneyRisk') return { value: q.moneyRisk.count };
  if (key === 'objections')
    return {
      value: q.objections.count,
      hint: q.objections.growing
        ? `${q.objections.growing} grupo(s) crescendo`
        : 'nenhum grupo crescendo',
    };
  if (key === 'followups')
    return {
      value: q.followups.count,
      hint: `${q.followups.overdue} atrasado${q.followups.overdue === 1 ? '' : 's'}`,
    };
  if (key === 'competitor') return { value: q.competitor.count };
  return { value: q.rtvHelp.count, hint: 'RTVs com sinal aberto' };
}

function QuestionBody({
  home,
  question,
  onOpenFact,
}: {
  home: DashboardHome;
  question: QuestionKey;
  onOpenFact: (id: string) => void;
}) {
  const empty = (
    <Empty
      title="Nenhum fato aberto neste recorte."
      hint="Novos sinais aparecem aqui conforme as conversas do time são analisadas."
    />
  );
  if (question === 'objections') {
    const groups = home.questions.objections.groups;
    if (!groups.length) return empty;
    return (
      <Card className="grid gap-4">
        {groups.map((g) => (
          <div key={`${g.crop}|${g.region}`}>
            <p className="mb-2 text-sm font-semibold">
              {g.crop} · {g.region}{' '}
              <span className="font-normal text-muted">
                {g.current} agora / {g.previous} antes
                {g.growing ? ' · crescendo' : ''}
              </span>
            </p>
            <FactList items={g.items} onOpen={onOpenFact} />
          </div>
        ))}
      </Card>
    );
  }
  if (question === 'rtvHelp') {
    const items = home.questions.rtvHelp.items;
    if (!items.length) return empty;
    return (
      <Card className="grid gap-4">
        {items.map((rtv) => (
          <div key={rtv.rtvUserId ?? rtv.rtvName}>
            <p className="mb-2 text-sm font-semibold">
              {rtv.rtvName}{' '}
              <span className="font-normal text-muted">
                score {rtv.score} · {rtv.critical} crítico · {rtv.overdue} atrasado
              </span>
            </p>
            <FactList items={rtv.items} onOpen={onOpenFact} />
          </div>
        ))}
      </Card>
    );
  }
  const items =
    question === 'moneyRisk'
      ? home.questions.moneyRisk.items
      : question === 'followups'
        ? home.questions.followups.items
        : home.questions.competitor.items;
  if (!items.length) return empty;
  return (
    <Card>
      <FactList items={items} onOpen={onOpenFact} />
    </Card>
  );
}

function FactList({ items, onOpen }: { items: FactCard[]; onOpen: (id: string) => void }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <FactRow key={item.id} fact={item} onOpen={() => onOpen(item.id)} />
      ))}
    </ul>
  );
}
