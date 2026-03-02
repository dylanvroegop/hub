import crypto from 'crypto';
import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';
import { ingestDemoRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashKey(input: string): string {
  return crypto.createHash('sha1').update(input, 'utf8').digest('hex').slice(0, 16);
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = ingestDemoRequestSchema.safeParse(payload);

    if (!parsed.success) {
      await addIngestFailure('website_demo_request', 'invalid_payload', {
        errors: parsed.error.flatten(),
      });
      return jsonError('Payload validatie mislukt.', 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const sourceRecordId = hashKey(`${data.email.toLowerCase()}|${data.submittedAt}`);

    const item = await upsertOpsItemFromSource({
      type: 'demo_request',
      title: `Demo aanvraag: ${data.naam} (${data.bedrijfsnaam})`,
      summary: data.bericht || 'Geen extra bericht opgegeven.',
      priority: 'medium',
      severity: 'info',
      source_system: 'website',
      source_collection: 'demo_requests',
      source_record_id: sourceRecordId,
      normalized_payload: {
        naam: data.naam,
        bedrijfsnaam: data.bedrijfsnaam,
        email: data.email,
        telefoonnummer: data.telefoonnummer,
        submittedAt: data.submittedAt,
      },
      raw_payload: data,
      tags: ['website', 'demo-request'],
    });

    await createItemEvent(item.id, 'website_demo_ingested', null, {
      email: data.email,
      submittedAt: data.submittedAt,
    });

    return jsonOk({ ok: true, itemId: item.id, requestKey: sourceRecordId });
  } catch (error) {
    return handleRouteError(error);
  }
}
