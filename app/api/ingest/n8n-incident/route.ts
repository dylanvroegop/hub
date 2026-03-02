import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';
import { ingestN8nIncidentSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = ingestN8nIncidentSchema.safeParse(payload);

    if (!parsed.success) {
      await addIngestFailure('n8n_incident', 'invalid_payload', {
        errors: parsed.error.flatten(),
      });
      return jsonError('Payload validatie mislukt.', 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const status = normalizeStatus(data.status);

    const item = await upsertOpsItemFromSource({
      type: 'n8n_incident',
      title: `n8n incident: ${data.workflowId} (${status})`,
      summary: data.error || 'n8n incident ontvangen zonder foutmelding',
      priority: status === 'failed' || status === 'error' ? 'hoog' : 'medium',
      severity: status === 'failed' || status === 'error' ? 'error' : 'waarschuwing',
      source_system: data.sourceSystem,
      source_collection: data.workflowId,
      source_record_id: data.executionId,
      normalized_payload: {
        workflowId: data.workflowId,
        executionId: data.executionId,
        status,
      },
      raw_payload: {
        ...data,
      },
      tags: ['n8n', status, data.workflowId],
    });

    await createItemEvent(item.id, 'n8n_incident_ingested', null, {
      workflowId: data.workflowId,
      executionId: data.executionId,
      status,
    });

    return jsonOk({ ok: true, itemId: item.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
