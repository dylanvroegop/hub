import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { runHourlyDataQualityChecks } from '@/lib/data-quality';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminFromRequest(request);
    const result = await runHourlyDataQualityChecks();
    return jsonOk({ ok: true, actor, result });
  } catch (error) {
    return handleRouteError(error);
  }
}
