import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const supabase = getSupabaseAdmin();

    const [syncState, failures] = await Promise.all([
      supabase.from('ops_source_sync_state').select('*').order('last_run_at', { ascending: false }),
      supabase.from('ops_ingest_failures').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    if (syncState.error) throw syncState.error;
    if (failures.error) throw failures.error;

    return jsonOk({
      ok: true,
      syncState: syncState.data || [],
      failures: failures.data || [],
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
