import { NextResponse } from 'next/server';
import { leadCaptureSchema } from '@/lib/schemas';
import { saveLead } from '@/lib/lead-store';
import type { LeadCapturePayload } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const json = await request.json();

    // backward compatibility: allow old payload with contact.email
    const normalized =
      typeof json?.contact?.email === 'string'
        ? {
            firstName: json.contact.firstName ?? json.contact.voornaam,
            email: json.contact.email,
            source: json.source,
            campaign: json.campaign,
            timestamp: new Date().toISOString(),
            quickInput: json.quickInput ?? json.inputSnapshot,
            unknownSelection: json.unknownSelection,
            advancedInput: json.advancedInput,
            resultSnapshot: json.resultSnapshot,
          }
        : json;

    const parsed = leadCaptureSchema.safeParse(normalized);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ ok: false, message: issue?.message || 'Ongeldige lead-invoer.' }, { status: 400 });
    }

    const payload = {
      ...parsed.data,
      firstName: parsed.data.firstName?.trim() || undefined,
      timestamp: parsed.data.timestamp || new Date().toISOString(),
      source: parsed.data.source || 'verliescheck-v2',
      unknownSelection: parsed.data.unknownSelection ?? {},
      advancedInput: parsed.data.advancedInput ?? {},
    };

    const record = saveLead(payload as LeadCapturePayload);

    return NextResponse.json({
      ok: true,
      id: record.id,
      message: 'Lead opgeslagen. Rapport is vrijgegeven.',
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'Lead kon niet worden opgeslagen.' }, { status: 500 });
  }
}
