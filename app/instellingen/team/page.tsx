import { ProtectedShell } from '@/components/protected-shell';
import { TeamView } from '@/components/team-view';

export default function TeamPage() {
  return (
    <ProtectedShell title="Instellingen / Team" subtitle="Owners beheren voor triage en toewijzing">
      <TeamView />
    </ProtectedShell>
  );
}
