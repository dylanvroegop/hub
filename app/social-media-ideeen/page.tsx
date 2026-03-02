import { ItemsListView } from '@/components/items-list-view';
import { ProtectedShell } from '@/components/protected-shell';

export default function SocialMediaIdeeenPage() {
  return (
    <ProtectedShell
      title="Social ideeën"
      subtitle="Ideeën uit n8n, centraal zichtbaar voor selectie, triage en opvolging"
    >
      <div className="grid">
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>Webhook voor n8n</h3>
          <p className="page-sub" style={{ marginBottom: 8 }}>
            Laat je n8n workflow posten naar <code>/api/ingest/social-media-ideas</code> met dezelfde
            signed-header als je andere ingest routes.
          </p>
          <div className="grid grid-2">
            <div className="kv">
              <small>Verplicht</small>
              <span><code>text</code> of <code>title</code></span>
            </div>
            <div className="kv">
              <small>Aanbevolen</small>
              <span><code>ideaId</code>, <code>platform</code>, <code>hook</code>, <code>concept</code></span>
            </div>
          </div>
        </div>

        <ItemsListView
          fixedType="feedback"
          fixedTag="social-media-idea"
          title="Social media ideeënpool"
          description="Elke ingevoerde post- of contentkans uit n8n, gefilterd in één overzicht."
        />
      </div>
    </ProtectedShell>
  );
}
