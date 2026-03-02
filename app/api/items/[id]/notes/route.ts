import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk, readJsonSafe } from '@/lib/api';
import { requireAdminFromRequest } from '@/lib/auth-server';
import { addItemNote, getItemNotes } from '@/lib/ops-db';
import { itemNoteSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requireAdminFromRequest(request);
    const notes = await getItemNotes(context.params.id);
    return jsonOk({ ok: true, notes });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const actor = await requireAdminFromRequest(request);
    const body = await readJsonSafe(request);
    const parsed = itemNoteSchema.safeParse(body || {});
    if (!parsed.success) {
      return jsonError('Ongeldige notitie.', 400, parsed.error.flatten());
    }

    const note = await addItemNote(context.params.id, parsed.data.note, actor);
    return jsonOk({ ok: true, note });
  } catch (error) {
    return handleRouteError(error);
  }
}
