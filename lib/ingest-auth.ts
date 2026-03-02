import { NextRequest } from 'next/server';

import { AuthError } from '@/lib/auth-server';
import { verifyWebhookSignature } from '@/lib/hmac';

export async function readSignedPayload(request: NextRequest): Promise<{ raw: string; payload: unknown }> {
  const raw = await request.text();
  const secret = request.headers.get('x-offertehulp-secret');

  if (!verifyWebhookSignature(raw, secret)) {
    throw new AuthError('Webhook signature ongeldig.', 403);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new AuthError('Webhook body is geen geldige JSON.', 400);
  }

  return { raw, payload };
}
