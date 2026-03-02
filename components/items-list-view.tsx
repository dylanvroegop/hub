'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { PriorityPill, SeverityPill, StatusPill } from '@/components/pill';
import { fetchJson, formatDate } from '@/lib/client-api';
import type { OpsItem, OpsPriority, OpsStatus, OpsItemType } from '@/lib/types';

interface ItemsResponse {
  ok: boolean;
  items: OpsItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface ItemsListViewProps {
  fixedType?: OpsItemType;
  fixedTag?: string;
  title?: string;
  description?: string;
  initialStatus?: OpsStatus | '';
  showCard?: boolean;
}

const STATUS_LABELS: Record<OpsStatus, string> = {
  nieuw: 'Nieuw',
  in_triage: 'In triage',
  bezig: 'Bezig',
  geblokkeerd: 'Geblokkeerd',
  opgelost: 'Opgelost',
  genegeerd: 'Genegeerd',
};

const PRIORITY_OPTIONS: Array<{ value: OpsPriority; label: string }> = [
  { value: 'laag', label: 'Laag' },
  { value: 'medium', label: 'Medium' },
  { value: 'hoog', label: 'Hoog' },
  { value: 'kritiek', label: 'Kritiek' },
];

const STATUS_OPTIONS: OpsStatus[] = ['nieuw', 'in_triage', 'bezig', 'geblokkeerd', 'opgelost', 'genegeerd'];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pickText(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function extractPeopleContext(item: OpsItem) {
  const normalized = asRecord(item.normalized_payload);
  const raw = asRecord(item.raw_payload);
  const aanvraag = asRecord(raw.aanvraag);

  const contactName =
    pickText(normalized, ['contactNaam', 'contact_name', 'name']) ||
    pickText(aanvraag, ['contactNaam', 'naam', 'name']) ||
    pickText(raw, ['contactNaam', 'name']);
  const email =
    pickText(normalized, ['email']) || pickText(aanvraag, ['email']) || pickText(raw, ['email', 'emailAddress']);
  const phone =
    pickText(normalized, ['telefoon', 'phone', 'phoneNumber']) ||
    pickText(aanvraag, ['telefoon', 'phone']) ||
    pickText(raw, ['telefoon', 'phone']);
  const company =
    pickText(normalized, ['bedrijfNaam', 'bedrijf', 'company']) ||
    pickText(aanvraag, ['bedrijfNaam', 'bedrijf', 'company']) ||
    pickText(raw, ['bedrijfNaam', 'company']);

  if (!contactName && item.tags_cache.includes('social-media-idea')) {
    return {
      contactName: pickText(normalized, ['platform']) || 'Social media idee',
      email: pickText(normalized, ['format']) || null,
      phone: pickText(normalized, ['hook']) || null,
      company: pickText(normalized, ['audience']) || null,
    };
  }

  return { contactName, email, phone, company };
}

function statusCountText(items: OpsItem[]) {
  const counts = items.reduce<Record<OpsStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { nieuw: 0, in_triage: 0, bezig: 0, geblokkeerd: 0, opgelost: 0, genegeerd: 0 },
  );

  return STATUS_OPTIONS.map((status) => ({
    label: STATUS_LABELS[status],
    value: counts[status],
  }));
}

export function ItemsListView({
  fixedType,
  fixedTag,
  initialStatus = '',
  title,
  description,
  showCard = true,
}: ItemsListViewProps) {
  const [items, setItems] = useState<OpsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [status, setStatus] = useState<OpsStatus | ''>(initialStatus);
  const [priority, setPriority] = useState<OpsPriority | ''>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (fixedType) params.set('type', fixedType);
        if (fixedTag) params.set('tag', fixedTag);
        if (status) params.set('status', status);
        if (priority) params.set('priority', priority);
        if (q.trim()) params.set('q', q.trim());

        const data = await fetchJson<ItemsResponse>(`/api/items?${params.toString()}`);
        if (!alive) return;
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Onbekende fout');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [fixedTag, fixedType, page, pageSize, priority, q, status]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const statusSummary = useMemo(() => statusCountText(items), [items]);
  const highAttentionCount = useMemo(
    () => items.filter((item) => item.priority === 'hoog' || item.priority === 'kritiek').length,
    [items],
  );
  const resolvedCount = useMemo(() => items.filter((item) => item.status === 'opgelost').length, [items]);

  const content = (
    <>
      {(title || description) && (
        <div style={{ marginBottom: 12 }}>
          {title ? <h3 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h3> : null}
          {description ? <p className="page-sub">{description}</p> : null}
        </div>
      )}

      <div className="items-summary-grid">
        <div className="items-summary-card">
          <small>Open op deze pagina</small>
          <strong>{items.filter((item) => !['opgelost', 'genegeerd'].includes(item.status)).length}</strong>
        </div>
        <div className="items-summary-card">
          <small>Hoge prioriteit</small>
          <strong>{highAttentionCount}</strong>
        </div>
        <div className="items-summary-card">
          <small>Opgelost</small>
          <strong>{resolvedCount}</strong>
        </div>
        <div className="items-summary-card">
          <small>Totaal resultaten</small>
          <strong>{total}</strong>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="Zoek op titel of samenvatting"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus((e.target.value || '') as OpsStatus | '');
          }}
        >
          <option value="">Alle statussen</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => {
            setPage(1);
            setPriority((e.target.value || '') as OpsPriority | '');
          }}
        >
          <option value="">Alle prioriteiten</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="status-strip">
        {statusSummary.map((entry) => (
          <span key={entry.label} className="status-strip-item">
            <strong>{entry.value}</strong> {entry.label}
          </span>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Laden…</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Aanvraag</th>
              <th>Aanvrager</th>
              <th>Status</th>
              <th>Prioriteit</th>
              <th>Severity</th>
              <th>Bron</th>
              <th>Updates</th>
              <th>Actie</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const info = extractPeopleContext(item);
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div>{item.title}</div>
                      <small className="muted">{item.summary || 'Geen samenvatting beschikbaar'}</small>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <small>{info.contactName || 'Onbekende contactpersoon'}</small>
                      <small className="muted">{info.company || info.email || '-'}</small>
                      <small className="muted">{info.phone || '-'}</small>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <PriorityPill priority={item.priority} />
                  </td>
                  <td>
                    <SeverityPill severity={item.severity} />
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <small>{item.source_system}</small>
                      <small className="muted">{item.type}</small>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <small>Aangemaakt: {formatDate(item.created_at)}</small>
                      <small className="muted">Laatst gezien: {formatDate(item.last_seen_at)}</small>
                    </div>
                  </td>
                  <td>
                    <Link href={`/item/${item.id}`} className="table-action-link">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="muted" style={{ padding: '8px 0' }}>
                    Geen resultaten voor de huidige filters.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <small className="muted">
          {total} resultaten · pagina {page}/{totalPages}
        </small>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Vorige
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Volgende
          </button>
        </div>
      </div>
    </>
  );

  if (!showCard) return content;
  return <div className="card">{content}</div>;
}
