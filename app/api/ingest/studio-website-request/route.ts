import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';
import { ingestStudioWebsiteRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = ingestStudioWebsiteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      await addIngestFailure('studio_website_request', 'invalid_payload', {
        errors: parsed.error.flatten(),
      });
      return jsonError('Payload validatie mislukt.', 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const contactNaam = data.aanvraag.contactNaam;
    const websiteType = data.aanvraag.websiteType;

    const item = await upsertOpsItemFromSource({
      type: 'website_request',
      title: `Website-aanvraag: ${contactNaam} (${websiteType})`,
      summary: data.aanvraag.projectBeschrijving || 'Geen projectbeschrijving opgegeven.',
      priority: 'medium',
      severity: 'info',
      source_system: 'studio_api',
      source_collection: 'website_build_requests',
      source_record_id: data.requestId,
      normalized_payload: {
        requestId: data.requestId,
        source: data.source,
        submittedAt: data.submittedAt || null,
        contactNaam: data.aanvraag.contactNaam,
        websiteType: data.aanvraag.websiteType,
        budgetRange: data.aanvraag.budgetRange || null,
        contactVoorkeur: data.aanvraag.contactVoorkeur,
        email: data.aanvraag.email,
        telefoon: data.aanvraag.telefoon,
      },
      raw_payload: data,
      tags: ['website-request', 'studio-api'],
    });

    await createItemEvent(item.id, 'studio_website_request_ingested', null, {
      requestId: data.requestId,
      source: data.source,
    });

    return jsonOk({ ok: true, itemId: item.id, requestId: data.requestId });
  } catch (error) {
    return handleRouteError(error);
  }
}
