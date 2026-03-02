import { NextResponse } from 'next/server';
import { calculateEstimate } from '@/lib/calc';
import { calcRequestSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = calcRequestSchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Ongeldige invoer voor verliesberekening.';
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const result = calculateEstimate(parsed.data.quickInput, parsed.data.unknownSelection, parsed.data.advancedInput);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: 'Berekening kon niet worden verwerkt.' }, { status: 500 });
  }
}
