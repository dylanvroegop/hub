import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { getOpsAdminEmails, getSessionCookieName } from '@/lib/env';
import type { AdminPrincipal } from '@/lib/types';

class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1]?.trim() || null;
  }
  return null;
}

function isAllowedEmail(email: string): boolean {
  return getOpsAdminEmails().includes(email.toLowerCase());
}

function allowUnverifiedIdTokensInLocalDev(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.OPS_ALLOW_UNVERIFIED_ID_TOKENS === 'true';
}

function decodeJwtPayloadUnverified(token: string): { uid: string; email: string; name: string | null } {
  const parts = token.split('.');
  if (parts.length < 2) throw new AuthError('Invalid token format.', 401);

  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as {
    sub?: string;
    user_id?: string;
    email?: string;
    name?: string;
  };

  const email = (decoded.email || '').trim().toLowerCase();
  const uid = (decoded.sub || decoded.user_id || '').trim();
  if (!uid || !email) throw new AuthError('Token mist uid of email.', 401);

  return {
    uid,
    email,
    name: decoded.name || null,
  };
}

export async function verifyIdTokenAndAllowlist(token: string): Promise<AdminPrincipal> {
  if (!token) throw new AuthError('Missing token.');
  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) throw new AuthError('No email in token.', 403);
    if (!isAllowedEmail(email)) throw new AuthError('Email not allowlisted.', 403);

    return {
      uid: decoded.uid,
      email,
      name: decoded.name || null,
    };
  } catch (error) {
    if (!allowUnverifiedIdTokensInLocalDev()) {
      throw error;
    }

    const decoded = decodeJwtPayloadUnverified(token);
    if (!isAllowedEmail(decoded.email)) {
      throw new AuthError('Email not allowlisted.', 403);
    }

    return decoded;
  };
}

export async function requireAdminFromRequest(request: NextRequest): Promise<AdminPrincipal> {
  const cookieName = getSessionCookieName();
  const cookieToken = request.cookies.get(cookieName)?.value || null;
  const bearerToken = extractBearerToken(request);
  const token = bearerToken || cookieToken;
  if (!token) throw new AuthError('Unauthorized.');
  return verifyIdTokenAndAllowlist(token);
}

export async function requireAdminFromServerComponent(): Promise<AdminPrincipal> {
  const cookieName = getSessionCookieName();
  const token = cookies().get(cookieName)?.value || '';
  if (!token) throw new AuthError('Unauthorized.');
  return verifyIdTokenAndAllowlist(token);
}

export { AuthError };
