import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { listRedditComplaints } from '@/lib/ops-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const params = request.nextUrl.searchParams;

    const page = Number(params.get('page') || '1');
    const pageSize = Number(params.get('pageSize') || '25');

    const result = await listRedditComplaints({
      painTopic: params.get('painTopic') || undefined,
      sentiment: params.get('sentiment') || undefined,
      subreddit: params.get('subreddit') || undefined,
      page,
      pageSize,
    });

    return jsonOk({ ok: true, ...result, page, pageSize });
  } catch (error) {
    return handleRouteError(error);
  }
}
