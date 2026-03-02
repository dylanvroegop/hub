import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { listOpsItems } from '@/lib/ops-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const params = request.nextUrl.searchParams;

    const page = Number(params.get('page') || '1');
    const pageSize = Number(params.get('pageSize') || '25');

    const result = await listOpsItems({
      type: params.get('type') || undefined,
      status: params.get('status') || undefined,
      priority: params.get('priority') || undefined,
      owner: params.get('owner') || undefined,
      source: params.get('source') || undefined,
      tag: params.get('tag') || undefined,
      from: params.get('from') || undefined,
      to: params.get('to') || undefined,
      q: params.get('q') || undefined,
      page,
      pageSize,
    });

    return jsonOk({
      ok: true,
      items: result.items,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
