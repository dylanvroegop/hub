'use client';

import { useEffect, useMemo, useState } from 'react';

import { PriorityPill, SeverityPill, StatusPill } from '@/components/pill';
import { fetchJson, formatDate } from '@/lib/client-api';
import type { OpsItem, OpsPriority, OpsSeverity, OpsStatus } from '@/lib/types';

interface ItemDetailResponse {
  ok: boolean;
  item: OpsItem;
  notes: Array<{
    id: number;
    author_uid: string;
    author_email: string | null;
    note: string;
    created_at: string;
  }>;
  events: Array<{
    id: number;
    event_type: string;
    actor_uid: string | null;
    actor_email: string | null;
    event_payload: Record<string, unknown>;
    created_at: string;
  }>;
  redditDetails?: Record<string, unknown> | null;
  dataQualityDetails?: Record<string, unknown> | null;
}

interface OwnersResponse {
  ok: boolean;
  owners: Array<{ id: string; email: string; display_name: string }>;
}

type HumanField = { label: string; value: string };

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

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((entry) => formatUnknown(entry)).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractHumanFields(item: OpsItem): HumanField[] {
  const normalized = asRecord(item.normalized_payload);
  const raw = asRecord(item.raw_payload);
  const aanvraag = asRecord(raw.aanvraag);

  if (item.tags_cache.includes('social-media-idea')) {
    return [
      { label: 'Platform', value: pickText(normalized, ['platform']) || '-' },
      { label: 'Format', value: pickText(normalized, ['format']) || '-' },
      { label: 'Hook', value: pickText(normalized, ['hook']) || '-' },
      { label: 'Concept', value: pickText(normalized, ['concept']) || item.summary || '-' },
      { label: 'Doelgroep', value: pickText(normalized, ['audience']) || '-' },
      { label: 'Call to action', value: pickText(normalized, ['callToAction']) || '-' },
      { label: 'Bron', value: pickText(normalized, ['source']) || item.source_system },
    ];
  }

  const contactName =
    pickText(normalized, ['contactNaam', 'contact_name', 'name']) ||
    pickText(aanvraag, ['contactNaam', 'naam', 'name']) ||
    pickText(raw, ['contactNaam', 'name']);
  const company =
    pickText(normalized, ['bedrijfNaam', 'bedrijf', 'company']) ||
    pickText(aanvraag, ['bedrijfNaam', 'bedrijf', 'company']) ||
    pickText(raw, ['bedrijfNaam', 'company']);
  const email =
    pickText(normalized, ['email']) || pickText(aanvraag, ['email']) || pickText(raw, ['email', 'emailAddress']);
  const phone =
    pickText(normalized, ['telefoon', 'phone', 'phoneNumber']) ||
    pickText(aanvraag, ['telefoon', 'phone']) ||
    pickText(raw, ['telefoon', 'phone']);
  const websiteType =
    pickText(normalized, ['websiteType', 'website_type']) ||
    pickText(aanvraag, ['websiteType']) ||
    pickText(raw, ['websiteType']);
  const budget =
    pickText(normalized, ['budgetRange', 'budget']) || pickText(aanvraag, ['budgetRange']) || pickText(raw, ['budgetRange']);
  const contactPreference =
    pickText(normalized, ['contactVoorkeur', 'contactPreference']) ||
    pickText(aanvraag, ['contactVoorkeur', 'contactVoorkeurLabel']) ||
    pickText(raw, ['contactVoorkeur']);

  const fields: HumanField[] = [
    { label: 'Contactpersoon', value: contactName || '-' },
    { label: 'Bedrijf', value: company || '-' },
    { label: 'E-mail', value: email || '-' },
    { label: 'Telefoon', value: phone || '-' },
    { label: 'Type aanvraag', value: websiteType || item.type },
    { label: 'Budget', value: budget || '-' },
    { label: 'Contactvoorkeur', value: contactPreference || '-' },
  ];

  return fields;
}

export function ItemDetailView({ id }: { id: string }) {
  const [data, setData] = useState<ItemDetailResponse | null>(null);
  const [owners, setOwners] = useState<OwnersResponse['owners']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<OpsStatus | ''>('');
  const [priority, setPriority] = useState<OpsPriority | ''>('');
  const [severity, setSeverity] = useState<OpsSeverity | ''>('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [resolution, setResolution] = useState('');
  const [noteInput, setNoteInput] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [itemData, ownersData] = await Promise.all([
        fetchJson<ItemDetailResponse>(`/api/items/${id}`),
        fetchJson<OwnersResponse>('/api/owners'),
      ]);

      setData(itemData);
      setOwners(ownersData.owners);
      setStatus(itemData.item.status);
      setPriority(itemData.item.priority);
      setSeverity(itemData.item.severity);
      setOwnerId(itemData.item.owner_id || '');
      setTagsInput(itemData.item.tags_cache.join(', '));
      setResolution(itemData.item.resolution || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const normalizedTags = useMemo(
    () => tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tagsInput],
  );

  const humanFields = useMemo(() => (data ? extractHumanFields(data.item) : []), [data]);

  async function saveMutations() {
    try {
      await fetchJson(`/api/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          priority,
          severity,
          ownerId: ownerId || null,
          tags: normalizedTags,
          resolution: resolution || null,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update mislukt');
    }
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    try {
      await fetchJson(`/api/items/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: noteInput.trim() }),
      });
      setNoteInput('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notitie opslaan mislukt');
    }
  }

  async function markAsNotComplaint() {
    setTagsInput((prev) => {
      const tags = prev.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (!tags.includes('not-true-complaint')) tags.push('not-true-complaint');
      return tags.join(', ');
    });
    setStatus('genegeerd');
  }

  async function markAsProductInsight() {
    setTagsInput((prev) => {
      const tags = prev.split(',').map((tag) => tag.trim()).filter(Boolean);
      if (!tags.includes('product-insight')) tags.push('product-insight');
      return tags.join(', ');
    });
  }

  if (loading && !data) return <p className="muted">Item laden…</p>;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="error">Geen itemdata.</p>;

  return (
    <div className="grid" style={{ gap: 14 }}>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{data.item.title}</h3>
        <p className="muted">{data.item.summary || 'Geen samenvatting'}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <StatusPill status={data.item.status} />
          <PriorityPill priority={data.item.priority} />
          <SeverityPill severity={data.item.severity} />
          <span className="pill">{data.item.type}</span>
          <span className="pill">{data.item.source_system}</span>
        </div>

        <div className="grid grid-2">
          <div className="kv">
            <small>Item ID</small>
            <span>{data.item.id}</span>
          </div>
          <div className="kv">
            <small>Source record</small>
            <span>{data.item.source_record_id || '-'}</span>
          </div>
          <div className="kv">
            <small>Aangemaakt</small>
            <span>{formatDate(data.item.created_at)}</span>
          </div>
          <div className="kv">
            <small>Laatst bijgewerkt</small>
            <span>{formatDate(data.item.updated_at)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Kerninformatie</h3>
        <div className="grid grid-2">
          {humanFields.map((field) => (
            <div key={field.label} className="kv">
              <small>{field.label}</small>
              <span>{field.value}</span>
            </div>
          ))}
        </div>

        {data.item.source_url ? (
          <p style={{ marginTop: 12 }}>
            <a href={data.item.source_url} target="_blank" rel="noreferrer">
              Open bronlink
            </a>
          </p>
        ) : null}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Triage acties</h3>
        <div className="form-row">
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as OpsStatus)}>
              <option value="nieuw">nieuw</option>
              <option value="in_triage">in_triage</option>
              <option value="bezig">bezig</option>
              <option value="geblokkeerd">geblokkeerd</option>
              <option value="opgelost">opgelost</option>
              <option value="genegeerd">genegeerd</option>
            </select>
          </div>

          <div>
            <label>Prioriteit</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as OpsPriority)}>
              <option value="laag">laag</option>
              <option value="medium">medium</option>
              <option value="hoog">hoog</option>
              <option value="kritiek">kritiek</option>
            </select>
          </div>

          <div>
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as OpsSeverity)}>
              <option value="info">info</option>
              <option value="waarschuwing">waarschuwing</option>
              <option value="error">error</option>
              <option value="kritiek">kritiek</option>
            </select>
          </div>

          <div>
            <label>Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Niet toegewezen</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.display_name} ({owner.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Tags (comma separated)</label>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Resolutie</label>
          <textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={saveMutations}>
            Opslaan
          </button>

          {data.item.type === 'reddit_complaint' ? (
            <>
              <button type="button" onClick={markAsNotComplaint}>
                Not a true complaint
              </button>
              <button type="button" onClick={markAsProductInsight}>
                Create product insight
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notities</h3>
          <textarea
            rows={4}
            placeholder="Nieuwe notitie"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={addNote}>Notitie toevoegen</button>
          </div>

          <div style={{ marginTop: 12 }}>
            {data.notes.map((note) => (
              <div key={note.id} className="card" style={{ marginBottom: 8 }}>
                <small className="muted">
                  {note.author_email || note.author_uid} · {formatDate(note.created_at)}
                </small>
                <p style={{ marginBottom: 0 }}>{note.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Timeline</h3>
          <div>
            {data.events.map((event) => (
              <div key={event.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{event.event_type}</strong>
                  <small className="muted">{formatDate(event.created_at)}</small>
                </div>
                <small className="muted">{event.actor_email || event.actor_uid || 'system'}</small>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                  {JSON.stringify(event.event_payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Payload details</h3>
        <div className="grid grid-2">
          <div>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Normalized payload</h4>
            <div className="kv-grid">
              {Object.entries(data.item.normalized_payload || {}).map(([key, value]) => (
                <div key={key} className="kv">
                  <small>{key}</small>
                  <span>{formatUnknown(value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Raw payload</h4>
            <details>
              <summary className="muted">Toon ruwe JSON</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.item.raw_payload, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>

      {data.redditDetails ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Reddit details</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.redditDetails, null, 2)}</pre>
        </div>
      ) : null}

      {data.dataQualityDetails ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Data quality details</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.dataQualityDetails, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
