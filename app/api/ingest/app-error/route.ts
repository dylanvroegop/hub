import { NextRequest } from 'next/server';
import { z } from 'zod';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['info', 'waarschuwing', 'error', 'kritiek']).default('error'),
  route: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional().default({}),
  eventId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});

function dedupeKey(input: z.infer<typeof schema>): string {
  if (input.eventId) return input.eventId;
  const route = input.route || 'unknown';
  const ts = input.createdAt || new Date().toISOString().slice(0, 16);
  return `${input.source}:${route}:${ts}:${input.title.slice(0, 32)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      await addIngestFailure('app_error', 'invalid_payload', parsed.error.flatten());
      return jsonError('Ongeldige app-error payload.', 400, parsed.error.flatten());
    }

    const body = parsed.data;
    const key = dedupeKey(body);

    const item = await upsertOpsItemFromSource({
      type: 'app_error',
      title: body.title,
      summary: body.message,
      priority: body.severity === 'kritiek' ? 'kritiek' : body.severity === 'error' ? 'hoog' : 'medium',
      severity: body.severity,
      source_system: body.source,
      source_collection: 'app_error',
      source_record_id: key,
      source_url: body.url || null,
      normalized_payload: {
        source: body.source,
        route: body.route,
        userId: body.userId,
      },
      raw_payload: body,
      tags: ['app-error', body.severity],
    });

    await createItemEvent(item.id, 'app_error_ingested', null, {
      source: body.source,
      route: body.route,
      dedupeKey: key,
    });

    return jsonOk({ ok: true, itemId: item.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
