import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk, readJsonSafe } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { backfillSchema } from '@/lib/schemas';
import { runFirestoreBackfill } from '@/lib/firestore-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminFromRequest(request);
    const body = await readJsonSafe(request);
    const parsed = backfillSchema.safeParse(body || {});

    if (!parsed.success) {
      return jsonError('Ongeldige backfill payload.', 400, parsed.error.flatten());
    }

    const results = [] as Array<{ source: string; processed: number }>;
    for (const source of parsed.data.sources) {
      const result = await runFirestoreBackfill(source, parsed.data.limitPerSource);
      results.push(result);
    }

    return jsonOk({
      ok: true,
      actor,
      results,
      totalProcessed: results.reduce((sum, item) => sum + item.processed, 0),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
