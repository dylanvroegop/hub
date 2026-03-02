import { RequestsHubView } from '@/components/requests-hub-view';
import { ProtectedShell } from '@/components/protected-shell';

export const dynamic = 'force-dynamic';

export default function VerzoekenPage() {
  return (
    <ProtectedShell
      title="Verzoeken"
      subtitle="Gestructureerde intake met tabs, snelfilters en duidelijke context per aanvraagtype"
    >
      <RequestsHubView />
    </ProtectedShell>
  );
}
