import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { runHourlyDataQualityChecks } from '@/lib/data-quality';
import { SUPPORTED_FIRESTORE_SOURCES, runFirestoreIncremental } from '@/lib/firestore-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidCronSecret(request: NextRequest): boolean {
  const configured = process.env.OPS_CRON_SECRET?.trim();
  if (!configured) return false;
  const provided = request.headers.get('x-cron-secret')?.trim();
  if (!provided) return false;
  return provided === configured;
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidCronSecret(request)) {
      return jsonError('Cron secret ongeldig.', 401);
    }

    const syncResults = [] as Array<{ source: string; processed: number }>;
    for (const source of SUPPORTED_FIRESTORE_SOURCES) {
      const result = await runFirestoreIncremental(source, 200);
      syncResults.push(result);
    }

    const qualityResult = await runHourlyDataQualityChecks();

    return jsonOk({
      ok: true,
      syncResults,
      qualityResult,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
