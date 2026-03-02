'use client';

import { useEffect, useState } from 'react';

import { fetchJson, formatDate } from '@/lib/client-api';

interface IntegrationsResponse {
  ok: boolean;
  syncState: Array<{
    source_key: string;
    firestore_collection: string;
    last_seen_created_at: string | null;
    last_doc_id: string | null;
    last_run_at: string | null;
    metadata: Record<string, unknown>;
  }>;
  failures: Array<{
    id: number;
    source: string;
    reason: string;
    payload: Record<string, unknown>;
    created_at: string;
    recovered: boolean;
  }>;
}

const SOURCES = [
  'support_feedback',
  'website_build_requests',
  'price_import_requests',
  'custom_klus_requests',
] as const;

export function IntegrationsView() {
  const [data, setData] = useState<IntegrationsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await fetchJson<IntegrationsResponse>('/api/integraties/status');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runBackfill() {
    setBusy('backfill');
    setError(null);
    try {
      await fetchJson('/api/sync/firestore/backfill', {
        method: 'POST',
        body: JSON.stringify({
          sources: SOURCES,
          limitPerSource: 1000,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function runIncremental(source: string) {
    setBusy(`incremental:${source}`);
    setError(null);
    try {
      await fetchJson('/api/sync/firestore/incremental', {
        method: 'POST',
        body: JSON.stringify({ source, limit: 200, runQualityChecks: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incremental sync mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function runQuality() {
    setBusy('quality');
    setError(null);
    try {
      await fetchJson('/api/data-quality/run', { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data quality run mislukt');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Acties</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={runBackfill} disabled={busy !== null}>
            {busy === 'backfill' ? 'Backfill…' : 'Volledige Firestore backfill'}
          </button>
          <button type="button" onClick={runQuality} disabled={busy !== null}>
            {busy === 'quality' ? 'Checks…' : 'Run data quality checks'}
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => runIncremental(source)}
              disabled={busy !== null}
            >
              {busy === `incremental:${source}` ? `Sync ${source}…` : `Incremental ${source}`}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Sync state</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Collectie</th>
                <th>Laatste run</th>
                <th>Cursor datum</th>
                <th>Cursor doc</th>
              </tr>
            </thead>
            <tbody>
              {(data?.syncState || []).map((row) => (
                <tr key={row.source_key}>
                  <td>{row.source_key}</td>
                  <td>{row.firestore_collection}</td>
                  <td>{formatDate(row.last_run_at)}</td>
                  <td>{formatDate(row.last_seen_created_at)}</td>
                  <td>{row.last_doc_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ingest failures</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Source</th>
                <th>Reason</th>
                <th>Tijd</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {(data?.failures || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.source}</td>
                  <td>{row.reason}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 11 }}>
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
