'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { SignOutButton } from '@/components/signout-button';
import { Spotlight } from '@/components/spotlight';

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

const navMain = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/inbox', label: 'Inbox', icon: '▣' },
  { href: '/verzoeken', label: 'Verzoeken', icon: '◉' },
];

const navOps = [
  { href: '/incidenten/n8n', label: 'Incidenten n8n', icon: '⚡' },
  { href: '/incidenten/data', label: 'Data-issues', icon: '⬡' },
  { href: '/social-media-ideeen', label: 'Social ideeën', icon: '◎' },
  { href: '/reddit-klachten', label: 'Reddit klachten', icon: '◇' },
];

const navSettings = [
  { href: '/instellingen/integraties', label: 'Integraties', icon: '⟡' },
  { href: '/instellingen/team', label: 'Team', icon: '⊞' },
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

  const renderNavGroup = (items: typeof navMain) =>
    items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={`nav-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
      >
        <span className="nav-icon">{item.icon}</span>
        {item.label}
      </Link>
    ));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">C</div>
          <h2 className="sidebar-title">Calvora Ops</h2>
        </div>
        <p className="sidebar-sub">Infrastructure Hub</p>

        <nav className="nav-group">
          {renderNavGroup(navMain)}
        </nav>

        <div className="nav-section-label">Operations</div>
        <nav className="nav-group">
          {renderNavGroup(navOps)}
        </nav>

        <div className="nav-section-label">Instellingen</div>
        <nav className="nav-group">
          {renderNavGroup(navSettings)}
        </nav>

        <div className="sidebar-user">
          <small className="muted">Ingelogd als</small>
          <div className="sidebar-user-email">{user?.email}</div>
          <SignOutButton />
        </div>
      </aside>

      <main className="main-wrap">
        <Spotlight />
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
