'use client';

import { formatEuro } from '@/lib/format';
import type { RootCauseSection } from '@/lib/report-insights';

interface RootCauseAccordionProps {
  sections: RootCauseSection[];
}

export default function RootCauseAccordion({ sections }: RootCauseAccordionProps) {
  return (
    <section className="card report-block" style={{ padding: '0.9rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Waarom dit gebeurt</h2>
      <div className="root-cause-stack">
        {sections.map((section) => (
          <details key={section.id} className="card root-cause-item" open={sections[0]?.id === section.id}>
            <summary>
              <span>{section.title}</span>
              <strong>{formatEuro(section.monthlyImpact)} / maand</strong>
            </summary>
            <ul>
              {section.bullets.slice(0, 3).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
