'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatEuro } from '@/lib/format';
import { generateDiagnosis, generateFixPlan, rankDrivers } from '@/lib/report-insights';
import { ESTIMATE_PAYLOAD_KEY } from '@/lib/storage';
import type { StoredEstimatePayload } from '@/lib/types';

export default function PrintReportView() {
  const [payload, setPayload] = useState<StoredEstimatePayload | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(ESTIMATE_PAYLOAD_KEY);
    if (!raw) return;

    try {
      setPayload(JSON.parse(raw) as StoredEstimatePayload);
    } catch {
      // ignore malformed payload
    }
  }, []);

  const diagnosis = useMemo(() => {
    if (!payload) return [];
    return generateDiagnosis(payload.result);
  }, [payload]);

  const fixPlan = useMemo(() => {
    if (!payload) return [];
    return generateFixPlan(rankDrivers(payload.result, 5));
  }, [payload]);

  if (!payload) {
    return (
      <main className="page premium-scan-bg">
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <section className="card" style={{ padding: '1rem' }}>
            <h1 style={{ marginTop: 0 }}>Geen rapport beschikbaar</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>Doe eerst de scan en open daarna deze printweergave.</p>
            <Link href="/check" className="btn btn-primary">
              Start snelle scan
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const result = payload.result;

  return (
    <main className="page premium-scan-bg print-page">
      <div className="container" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
        <section className="card paper-sheet print-sheet" style={{ padding: '1rem' }}>
          <div className="print-actions no-print">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print / Opslaan als PDF
            </button>
            <Link href="/resultaat" className="btn btn-secondary">
              Terug naar rapport
            </Link>
          </div>

          <h1>Verliesrapport timmerman</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            Waarschijnlijk verlies: <strong>{formatEuro(result.monthly.likely)} / maand</strong> • {formatEuro(result.yearly.likely)} / jaar
          </p>

          <h2>Diagnose</h2>
          <ul>
            {diagnosis.map((item) => (
              <li key={item.key}>
                <strong>{item.symptom}</strong> {item.cause}
              </li>
            ))}
          </ul>

          <h2>Jouw 3 snelste winsten</h2>
          <ul>
            {fixPlan.map((action) => (
              <li key={action.id}>
                <strong>{action.title}</strong> — {action.description} (Impact: ~{formatEuro(action.impactMonthly)} / maand)
              </li>
            ))}
          </ul>

          <h2>Uitsplitsing per categorie</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Categorie</th>
                <th>Conservatief</th>
                <th>Waarschijnlijk</th>
                <th>Hoog</th>
              </tr>
            </thead>
            <tbody>
              {result.categories.map((category) => (
                <tr key={category.key}>
                  <td>{category.label}</td>
                  <td>{formatEuro(category.monthly.conservative)}</td>
                  <td>{formatEuro(category.monthly.likely)}</td>
                  <td>{formatEuro(category.monthly.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
