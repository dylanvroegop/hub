'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { SignOutButton } from '@/components/signout-button';

interface ProtectedShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

type MeResponse = {
  ok: boolean;
  user: {
    uid: string;
    email: string;
    name: string | null;
  };
};

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/verzoeken', label: 'Verzoeken' },
  { href: '/incidenten/n8n', label: 'Incidenten n8n' },
  { href: '/incidenten/data', label: 'Data-issues' },
  { href: '/social-media-ideeen', label: 'Social ideeën' },
  { href: '/reddit-klachten', label: 'Reddit klachten' },
  { href: '/instellingen/integraties', label: 'Integraties' },
  { href: '/instellingen/team', label: 'Team' },
];

export function ProtectedShell({ title, subtitle, children, actions }: ProtectedShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = (await res.json()) as MeResponse;
        if (alive) setUser(data.user);
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
  }, [router]);

  const fullTitle = useMemo(() => {
    if (!user?.name) return title;
    return `${title}`;
  }, [title, user?.name]);

  if (loading) {
    return <div style={{ padding: 24 }}>Sessie laden…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p className="error">Kon sessie niet laden: {error}</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2 className="sidebar-title">Calvora Ops</h2>
        <p className="sidebar-sub">Infrastructuur cockpit v1</p>

        <nav className="nav-group">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 24 }}>
          <small className="muted">Ingelogd als</small>
          <div style={{ marginTop: 6, marginBottom: 10 }}>{user?.email}</div>
          <SignOutButton />
        </div>
      </aside>

      <main className="main-wrap">
        <div className="page-header">
          <div>
            <h1>{fullTitle}</h1>
            {subtitle ? <p className="page-sub">{subtitle}</p> : null}
          </div>
          <div>{actions}</div>
        </div>
        {children}
      </main>
    </div>
  );
}
