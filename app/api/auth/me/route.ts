import { NextRequest } from 'next/server';

import { handleRouteError, jsonOk } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { listOwners, upsertOwner } from '@/lib/ops-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAdminFromRequest(request);

    await upsertOwner({
      firebase_uid: principal.uid,
      email: principal.email,
      display_name: principal.name || principal.email,
    });

    const owners = await listOwners();

    return jsonOk({
      ok: true,
      user: principal,
      owners,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
