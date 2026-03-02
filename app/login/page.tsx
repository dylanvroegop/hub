'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { getFirebaseClientAuth } from '@/lib/firebase-client';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    return params.get('next') || '/dashboard';
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });

      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(body?.message || 'Login mislukt.');
      }

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende login fout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="card" style={{ width: 'min(460px, 100%)' }}>
        <h1 style={{ marginTop: 0 }}>Calvora Ops Login</h1>
        <p className="muted">Interne toegang met Firebase account + allowlist.</p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label>E-mail</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@calvora.nl"
              required
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Wachtwoord</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Inloggen…' : 'Inloggen'}
          </button>
        </form>
      </section>
    </main>
  );
}
