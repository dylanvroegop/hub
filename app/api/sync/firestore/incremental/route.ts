import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk, readJsonSafe } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { runHourlyDataQualityChecks } from '@/lib/data-quality';
import { runFirestoreIncremental } from '@/lib/firestore-sync';
import { incrementalSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminFromRequest(request);
    const body = await readJsonSafe<{ source?: string; limit?: number; runQualityChecks?: boolean }>(request);
    const parsed = incrementalSchema.safeParse(body || {});

    if (!parsed.success) {
      return jsonError('Ongeldige incremental payload.', 400, parsed.error.flatten());
    }

    const syncResult = await runFirestoreIncremental(parsed.data.source, parsed.data.limit);
    const qualityResult = body?.runQualityChecks === true
      ? await runHourlyDataQualityChecks()
      : { created: 0 };

    return jsonOk({
      ok: true,
      actor,
      syncResult,
      qualityResult,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
