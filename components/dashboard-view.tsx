'use client';

import { useEffect, useMemo, useState } from 'react';

import { fetchJson, formatDate } from '@/lib/client-api';

interface MetricsResponse {
  ok: boolean;
  metrics: {
    cards: {
      totalItems: number;
      openItems: number;
      criticalOpen: number;
      resolvedItems: number;
    };
    byType: Record<string, number>;
    sourceHealth: Record<string, { total: number; open: number }>;
    trend: Array<{
      day: string;
      total_items: number;
      opened_items: number;
      resolved_items: number;
      unresolved_items: number;
      critical_items: number;
    }>;
  };
}

export function DashboardView() {
  const [data, setData] = useState<MetricsResponse['metrics'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const res = await fetchJson<MetricsResponse>('/api/dashboard/metrics');
        if (alive) setData(res.metrics);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Onbekende fout');
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!data) return null;
    return [
      { label: 'Totaal items', value: data.cards.totalItems },
      { label: 'Open backlog', value: data.cards.openItems },
      { label: 'Kritiek open', value: data.cards.criticalOpen },
      { label: 'Afgehandeld', value: data.cards.resolvedItems },
    ];
  }, [data]);

  if (error) return <p className="error">Dashboard fout: {error}</p>;
  if (!data || !cards) return <p className="muted">Dashboard laden…</p>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid grid-4">
        {cards.map((card) => (
          <div key={card.label} className="card kv">
            <small>{card.label}</small>
            <strong style={{ fontSize: 24 }}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Verdeling per type</h3>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Aantal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byType).map(([type, count]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Source health</h3>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Totaal</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.sourceHealth).map(([source, stats]) => (
                  <tr key={source}>
                    <td>{source}</td>
                    <td>{stats.total}</td>
                    <td>{stats.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dagtrend (laatste 30 dagen)</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Dag</th>
                <th>Total</th>
                <th>Nieuw</th>
                <th>Opgelost</th>
                <th>Open einde dag</th>
                <th>Kritiek</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((row) => (
                <tr key={row.day}>
                  <td>{formatDate(row.day)}</td>
                  <td>{row.total_items}</td>
                  <td>{row.opened_items}</td>
                  <td>{row.resolved_items}</td>
                  <td>{row.unresolved_items}</td>
                  <td>{row.critical_items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
