'use client';

import { useMemo } from 'react';
import type { QuickFieldKey, QuickFieldMeta } from '@/lib/types';

interface ScanInputRowProps {
  field: QuickFieldKey;
  value: number;
  meta: QuickFieldMeta;
  standardMode: boolean;
  onValueChange: (field: QuickFieldKey, value: number, source: 'manual' | 'quick') => void;
}

function normalizeNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

export default function ScanInputRow({ field, value, meta, standardMode, onValueChange }: ScanInputRowProps) {
  const quickPickLabels = useMemo(() => meta.quickPicks.map((pick) => normalizeNumber(pick)), [meta.quickPicks]);

  return (
    <article className={`scan-input-row ${standardMode ? 'scan-input-row--recommended' : ''}`}>
      <div className="scan-input-row-head">
        <label htmlFor={`scan-${field}`}>{meta.label}</label>
        <span className="scan-help" title={meta.tooltip}>
          ⓘ
        </span>
      </div>

      <div className="scan-input-row-main">
        <div className="scan-input-wrap">
          <input
            id={`scan-${field}`}
            type="number"
            min={meta.min}
            max={meta.max}
            step={meta.step}
            value={value}
            onChange={(event) => {
              const raw = event.target.value.replace(',', '.');
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              onValueChange(field, parsed, 'manual');
            }}
          />
          <span>{meta.unit}</span>
        </div>

        <div className="scan-quick-picks" aria-label={`${meta.label} snelle waarden`}>
          {meta.quickPicks.map((pick, index) => {
            const active = Math.abs(value - pick) < meta.step / 2;
            return (
              <button
                key={`${field}-${pick}`}
                type="button"
                className={`scan-quick-pick ${active ? 'scan-quick-pick--active' : ''}`}
                onClick={() => onValueChange(field, pick, 'quick')}
              >
                {quickPickLabels[index]}
              </button>
            );
          })}
        </div>
      </div>

      <p>{meta.typicalRange}</p>
    </article>
  );
}
