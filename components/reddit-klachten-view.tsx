'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { fetchJson, formatDate } from '@/lib/client-api';

interface RedditResponse {
  ok: boolean;
  rows: Array<{
    item_id: string;
    subreddit: string;
    post_id: string;
    comment_id: string;
    author: string | null;
    score: number | null;
    pain_topic: string | null;
    sentiment: string | null;
    urgency_score: number | null;
    source_url: string | null;
    comment_body: string | null;
    ops_items: {
      id: string;
      title: string;
      status: string;
      priority: string;
      severity: string;
      tags_cache: string[];
      created_at: string;
      updated_at: string;
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export function RedditKlachtenView() {
  const [painTopic, setPainTopic] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [rows, setRows] = useState<RedditResponse['rows']>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (painTopic) params.set('painTopic', painTopic);
        if (sentiment) params.set('sentiment', sentiment);
        if (subreddit) params.set('subreddit', subreddit);

        const data = await fetchJson<RedditResponse>(`/api/reddit-klachten?${params.toString()}`);
        if (!alive) return;
        setRows(data.rows);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Onbekende fout');
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [painTopic, sentiment, subreddit]);

  return (
    <div className="card">
      <div className="toolbar">
        <select value={painTopic} onChange={(e) => setPainTopic(e.target.value)}>
          <option value="">Pain topic (alle)</option>
          <option value="prijs">prijs</option>
          <option value="planning">planning</option>
          <option value="kwaliteit">kwaliteit</option>
          <option value="communicatie">communicatie</option>
          <option value="vertrouwen">vertrouwen</option>
          <option value="overig">overig</option>
        </select>

        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">Sentiment (alle)</option>
          <option value="negatief">negatief</option>
          <option value="gemengd">gemengd</option>
          <option value="positief">positief</option>
        </select>

        <input
          placeholder="Subreddit (bijv r/Carpentry)"
          value={subreddit}
          onChange={(e) => setSubreddit(e.target.value)}
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Subreddit</th>
              <th>Kern klacht</th>
              <th>Pain topic</th>
              <th>Sentiment</th>
              <th>Urgency</th>
              <th>Score</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.subreddit}-${row.post_id}-${row.comment_id}`}>
                <td>{row.subreddit}</td>
                <td>
                  <div>{row.ops_items?.title || '-'}</div>
                  <small className="muted">{row.comment_body?.slice(0, 140) || '-'}</small>
                </td>
                <td>{row.pain_topic || '-'}</td>
                <td>{row.sentiment || '-'}</td>
                <td>{row.urgency_score ?? '-'}</td>
                <td>{row.score ?? '-'}</td>
                <td>{row.ops_items?.status || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link href={`/item/${row.item_id}`}>Open</Link>
                    {row.source_url ? (
                      <a href={row.source_url} target="_blank" rel="noreferrer">
                        Bron
                      </a>
                    ) : null}
                  </div>
                  <small className="muted">{formatDate(row.ops_items?.updated_at)}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
