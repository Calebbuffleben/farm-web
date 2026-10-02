'use client';

import type { DashboardHome } from '@/lib/dashboard-api';
import { Card, Chip, Empty, SectionHeader, STAGE_LABEL } from '@/components/ui';
import { FactRow } from './deal-drawer';

export function PortfolioPanel({
  home,
  onOpenFact,
}: {
  home: DashboardHome;
  onOpenFact: (id: string) => void;
}) {
  const portfolio = home.portfolio;
  return (
    <section className="reveal grid gap-10">
      <div>
        <SectionHeader
          title="Onde a demanda cresce"
          subtitle="Oportunidades por produto, cultura e região, contra a janela anterior."
        />
        {portfolio.opportunities.groups.length === 0 ? (
          <Empty title="Nenhuma oportunidade nesta janela." />
        ) : (
          <div className="grid gap-3">
            <p className="text-xs text-faint">
              {portfolio.opportunities.count} fato{portfolio.opportunities.count === 1 ? '' : 's'} ·{' '}
              {portfolio.opportunities.growing} grupo{portfolio.opportunities.growing === 1 ? '' : 's'} crescendo
            </p>
            {portfolio.opportunities.groups.map((group) => (
              <Card key={`${group.product}|${group.crop}|${group.region}`} className="!p-4">
                <p className="text-sm font-semibold">
                  {group.product} · {group.crop} · {group.region}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {group.current} agora / {group.previous} antes
                  {group.growing ? ' · crescendo' : ''}
                </p>
                <ul className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <FactRow key={item.id} fact={item} onOpen={() => onOpenFact(item.id)} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="Pressão de concorrente"
          subtitle="Menção em fechamento pesa mais que em sondagem. O nome fica no texto do fato."
        />
        {portfolio.competitive.groups.length === 0 ? (
          <Empty title="Nenhuma menção de concorrente nesta janela." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {portfolio.competitive.groups.map((group) => (
              <Card key={`${group.product}|${group.stage ?? 'none'}`} className="!p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{group.product}</p>
                  <span className="font-mono text-xl text-cooling">{group.count}</span>
                </div>
                <div className="mt-1">
                  <Chip tone="stage">{group.stage ? STAGE_LABEL[group.stage] : 'Sem estágio'}</Chip>
                </div>
                <ul className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <FactRow key={item.id} fact={item} onOpen={() => onOpenFact(item.id)} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
