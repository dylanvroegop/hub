import crypto from 'crypto';

import { getN8nHeaderSecret } from '@/lib/env';

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getN8nHeaderSecret()).update(payload, 'utf8').digest('hex');
}

export function verifyWebhookSignature(rawBody: string, providedSecret: string | null): boolean {
  if (!providedSecret) return false;

  // Accept either plain shared secret or sha256 signature digest.
  const configuredSecret = getN8nHeaderSecret();
  if (safeEqual(providedSecret, configuredSecret)) return true;

  const digest = sign(rawBody);
  return safeEqual(providedSecret, digest);
}
