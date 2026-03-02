import { IntegrationsView } from '@/components/integrations-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function IntegratiesPage() {
  return (
    <ProtectedShell
      title="Instellingen / Integraties"
      subtitle="Backfill, incremental sync, kwaliteitchecks en ingest failures"
    >
      <IntegrationsView />
    </ProtectedShell>
  );
}
