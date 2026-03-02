import { ItemsListView } from '@/components/items-list-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function DataIncidentsPage() {
  return (
    <ProtectedShell title="Incidenten / data" subtitle="Datakwaliteit, sync-mismatches en stuck states">
      <div className="grid" style={{ gap: 14 }}>
        <ItemsListView fixedType="app_error" title="App errors" />
        <ItemsListView fixedType="data_quality_issue" title="Data quality issues" />
      </div>
    </ProtectedShell>
  );
}
