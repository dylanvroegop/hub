import { DashboardView } from '@/components/dashboard-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function DashboardPage() {
  return (
    <ProtectedShell title="Dashboard" subtitle="Volume, backlog, SLA en brongezondheid">
      <DashboardView />
    </ProtectedShell>
  );
}
