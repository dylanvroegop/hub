'use client';

import type { DiagnosisItem } from '@/lib/report-insights';

interface DiagnosisBlockProps {
  items: DiagnosisItem[];
}

export default function DiagnosisBlock({ items }: DiagnosisBlockProps) {
  return (
    <section className="card report-block" style={{ padding: '0.9rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Diagnose: waar lekt je winst?</h2>
      <ul className="diagnosis-list">
        {items.map((item) => (
          <li key={item.key}>
            <strong>{item.symptom}</strong>
            <p>{item.cause}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
