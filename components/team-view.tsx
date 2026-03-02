'use client';

import { useEffect, useState } from 'react';

import { fetchJson } from '@/lib/client-api';

interface OwnersResponse {
  ok: boolean;
  owners: Array<{
    id: string;
    email: string;
    display_name: string;
  }>;
}

export function TeamView() {
  const [owners, setOwners] = useState<OwnersResponse['owners']>([]);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetchJson<OwnersResponse>('/api/owners');
    setOwners(res.owners);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOwner() {
    if (!email.trim() || !displayName.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await fetchJson('/api/owners', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim() }),
      });

      setEmail('');
      setDisplayName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Owner aanmaken mislukt');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Nieuwe owner</h3>
        <div className="form-row">
          <div>
            <label>Naam</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Support Lead" />
          </div>
          <div>
            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@calvora.nl" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={createOwner} disabled={busy}>
            {busy ? 'Opslaan…' : 'Owner opslaan'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Actieve owners</h3>
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>Naam</th>
                <th>E-mail</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id}>
                  <td>{owner.display_name}</td>
                  <td>{owner.email}</td>
                  <td>{owner.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
