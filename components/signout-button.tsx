'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getFirebaseClientAuth } from '@/lib/firebase-client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    try {
      setBusy(true);
      await fetch('/api/auth/session', { method: 'DELETE' });
      await getFirebaseClientAuth().signOut().catch(() => null);
      router.push('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={onSignOut} disabled={busy}>
      {busy ? 'Uitloggen…' : 'Uitloggen'}
    </button>
  );
}
