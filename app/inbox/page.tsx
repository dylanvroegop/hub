import { ItemsListView } from '@/components/items-list-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function InboxPage() {
  return (
    <ProtectedShell title="Inbox" subtitle="Alle verzoeken, incidenten en klachten in één feed">
      <ItemsListView title="Unified inbox" />
    </ProtectedShell>
  );
}
