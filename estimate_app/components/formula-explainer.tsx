'use client';

import { formatEuro } from '@/lib/format';
import type { FormulaLine } from '@/lib/types';

interface FormulaExplainerProps {
  formulas: FormulaLine[];
}

export default function FormulaExplainer({ formulas }: FormulaExplainerProps) {
  return (
    <section className="card report-block" style={{ padding: '0.9rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Hoe rekenen we dit?</h2>
      <div className="grid-3">
        {formulas.slice(0, 3).map((formula) => (
          <article key={formula.title} className="card" style={{ padding: '0.72rem' }}>
            <strong>{formula.title}</strong>
            <p style={{ margin: '0.35rem 0', color: 'hsl(var(--muted-foreground))' }}>{formula.formula}</p>
            <p style={{ marginBottom: 0, fontWeight: 700 }}>{formatEuro(formula.amount)} / maand</p>
          </article>
        ))}
      </div>
    </section>
  );
}
