import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk, readJsonSafe } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import {
  getDataQualityDetailsForItem,
  getItemEvents,
  getItemNotes,
  getOpsItemById,
  getRedditDetailsForItem,
  patchOpsItem,
} from '@/lib/ops-db';
import { patchItemSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requireAdminFromRequest(request);
    const id = context.params.id;

    const [item, notes, events, redditDetails, dataQualityDetails] = await Promise.all([
      getOpsItemById(id),
      getItemNotes(id),
      getItemEvents(id),
      getRedditDetailsForItem(id),
      getDataQualityDetailsForItem(id),
    ]);

    if (!item) return jsonError('Item niet gevonden.', 404);

    return jsonOk({
      ok: true,
      item,
      notes,
      events,
      redditDetails,
      dataQualityDetails,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const actor = await requireAdminFromRequest(request);
    const id = context.params.id;

    const body = await readJsonSafe(request);
    const parsed = patchItemSchema.safeParse(body || {});
    if (!parsed.success) {
      return jsonError('Ongeldige item update.', 400, parsed.error.flatten());
    }

    const updated = await patchOpsItem(id, parsed.data, actor);
    return jsonOk({ ok: true, item: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
