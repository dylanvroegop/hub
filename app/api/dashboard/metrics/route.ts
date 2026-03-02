import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { getDashboardMetrics } from '@/lib/ops-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const metrics = await getDashboardMetrics();
    return jsonOk({ ok: true, metrics });
  } catch (error) {
    return handleRouteError(error);
  }
}
