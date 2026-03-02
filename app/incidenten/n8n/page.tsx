import { ItemsListView } from '@/components/items-list-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function N8nIncidentsPage() {
  return (
    <ProtectedShell title="Incidenten / n8n" subtitle="Webhookfouten, skipped meldingen en workflowstoringen">
      <ItemsListView fixedType="n8n_incident" title="n8n incidenten" />
    </ProtectedShell>
  );
}
