import { NextResponse } from 'next/server';
import { leadCaptureSchema } from '@/lib/schemas';
import { saveLead } from '@/lib/lead-store';
import type { LeadCapturePayload } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = leadCaptureSchema.safeParse(json);

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
    const reportPath = '/resultaat/print';

    console.info('[lead] email-stub', {
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      reportPath,
      tags: record.tags,
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      message: 'Rapport vrijgegeven. Je ontvangt je rapport met print/PDF-link.',
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'Lead kon niet worden opgeslagen.' }, { status: 500 });
  }
}
