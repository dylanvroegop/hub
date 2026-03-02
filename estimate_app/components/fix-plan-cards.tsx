'use client';

import { formatEuro } from '@/lib/format';
import type { FixPlanAction } from '@/lib/report-insights';

interface FixPlanCardsProps {
  actions: FixPlanAction[];
}

export default function FixPlanCards({ actions }: FixPlanCardsProps) {
  return (
    <section className="card report-block" style={{ padding: '0.9rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Jouw 3 snelste winsten (30 dagen)</h2>
      <div className="fix-plan-grid">
        {actions.map((action) => (
          <article key={action.id} className="card fix-plan-card">
            <h3>{action.title}</h3>
            <p>{action.description}</p>
            <strong>Impact: ~{formatEuro(action.impactMonthly)} / maand</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
