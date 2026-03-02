import { ProtectedShell } from '@/components/protected-shell';
import { RedditKlachtenView } from '@/components/reddit-klachten-view';

export const dynamic = 'force-dynamic';

export default function RedditKlachtenPage() {
  return (
    <ProtectedShell
      title="Reddit klachten"
      subtitle="Niet-klant signalen van timmerklachten, inclusief pain topics en urgency"
    >
      <RedditKlachtenView />
    </ProtectedShell>
  );
}
