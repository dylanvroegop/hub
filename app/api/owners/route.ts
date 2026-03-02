import { NextRequest } from 'next/server';
import { z } from 'zod';

import { handleRouteError, jsonError, jsonOk, readJsonSafe } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { listOwners, upsertOwner } from '@/lib/ops-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createOwnerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(200),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const owners = await listOwners();
    return jsonOk({ ok: true, owners });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminFromRequest(request);
    const body = await readJsonSafe(request);
    const parsed = createOwnerSchema.safeParse(body || {});
    if (!parsed.success) return jsonError('Ongeldige owner payload.', 400, parsed.error.flatten());

    const owner = await upsertOwner({
      email: parsed.data.email,
      display_name: parsed.data.displayName,
      firebase_uid: null,
    });

    return jsonOk({ ok: true, owner });
  } catch (error) {
    return handleRouteError(error);
  }
}
