'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { formatPercent } from '@/lib/format';

interface LossImpactGaugeProps {
  percentage: number;
  emotionalLine: string;
}

function getGaugeStrokeColor(percentage: number): string {
  if (percentage < 18) return '#10b981';
  if (percentage < 30) return '#f59e0b';
  if (percentage < 42) return '#f97316';
  return '#ef4444';
}

export default function LossImpactGauge({ percentage, emotionalLine }: LossImpactGaugeProps) {
  const normalized = Math.max(0, Math.min(100, percentage));
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalized / 100) * circumference;
  const strokeColor = getGaugeStrokeColor(normalized);

  const ringStyle = useMemo(
    () => ({
      strokeDasharray: circumference,
      strokeDashoffset: dashOffset,
      stroke: strokeColor,
      '--gauge-offset': `${dashOffset}`,
    } as CSSProperties),
    [circumference, dashOffset, strokeColor]
  );

  return (
    <section className="card impact-gauge-card">
      <div className="impact-gauge-wrap" aria-hidden="true">
        <svg viewBox="0 0 220 220" className="impact-gauge-svg">
          <circle cx="110" cy="110" r={radius} className="impact-gauge-track" />
          <circle cx="110" cy="110" r={radius} className="impact-gauge-progress" style={ringStyle} />
        </svg>
        <div className="impact-gauge-center">
          <strong>{formatPercent(normalized)}</strong>
          <span>van je potentiële omzet</span>
        </div>
      </div>

      <p className="impact-emotional-line">{emotionalLine}</p>
    </section>
  );
}
