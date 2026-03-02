import { NextRequest, NextResponse } from 'next/server';

import { jsonError, handleRouteError, readJsonSafe } from '@/lib/api';
import { verifyIdTokenAndAllowlist } from '@/lib/auth-server';
import { getSessionCookieName } from '@/lib/env';
import { upsertOwner } from '@/lib/ops-db';
import { SUPPORTED_FIRESTORE_SOURCES, runFirestoreBackfill } from '@/lib/firestore-sync';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function bootstrapInitialBackfillIfEmpty() {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from('ops_items').select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count || 0) > 0) return;

  for (const source of SUPPORTED_FIRESTORE_SOURCES) {
    await runFirestoreBackfill(source, 2000);
  }
}

function extractBearer(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonSafe<{ idToken?: string }>(request);
    const bearer = extractBearer(request);
    const token = bearer || body?.idToken;

    if (!token) {
      return jsonError('Geen token ontvangen.', 401);
    }

    const principal = await verifyIdTokenAndAllowlist(token);

    await upsertOwner({
      firebase_uid: principal.uid,
      email: principal.email,
      display_name: principal.name || principal.email,
    });

    // First login bootstrap: populate historical records once if the ops hub is empty.
    void bootstrapInitialBackfillIfEmpty().catch((error) => {
      console.error('Initial backfill bootstrap failed', error);
    });

    const response = NextResponse.json({ ok: true, user: principal });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
