import { ItemDetailView } from '@/components/item-detail-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedShell title={`Item ${params.id}`} subtitle="Triage, notities, timeline en payloads">
      <ItemDetailView id={params.id} />
    </ProtectedShell>
  );
}
