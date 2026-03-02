'use client';

import type { ReactNode } from 'react';

interface ScanCardAccordionProps {
  id: string;
  icon: string;
  title: string;
  summary: string;
  description: string;
  open: boolean;
  highlighted?: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

export default function ScanCardAccordion({
  id,
  icon,
  title,
  summary,
  description,
  open,
  highlighted = false,
  onToggle,
  children,
}: ScanCardAccordionProps) {
  return (
    <section className={`card input-card ${open ? 'input-card--open' : ''} ${highlighted ? 'input-card--highlight' : ''}`}>
      <button type="button" className="input-card-header" onClick={() => onToggle(id)}>
        <div className="input-card-title-wrap">
          <span className="input-card-icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
            <small className="input-card-summary-line">{summary}</small>
          </div>
        </div>
        <span className="input-card-chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && <div className="input-card-body">{children}</div>}
    </section>
  );
}
