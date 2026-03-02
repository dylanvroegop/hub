import { NextResponse } from 'next/server';

import { isAuthError } from '@/lib/auth-server';

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      message,
      details: details ?? null,
    },
    { status },
  );
}

export async function readJsonSafe<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    const parsed = (await req.json()) as T;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function handleRouteError(error: unknown) {
  if (isAuthError(error)) {
    return jsonError(error.message, error.status);
  }

  const message = error instanceof Error ? error.message : 'Onbekende serverfout';
  return jsonError(message, 500);
}
