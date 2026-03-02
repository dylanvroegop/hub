function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return null;
  return value.trim();
}

export function getSupabaseUrl(): string {
  return optional('NEXT_PUBLIC_SUPABASE_URL') || required('SUPABASE_URL');
}

export function getSupabaseServiceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY');
}

export function getFirebaseProjectId(): string {
  return optional('FIREBASE_PROJECT_ID') || optional('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || 'studio-6011690104-60fbf';
}

export function getSessionCookieName(): string {
  return optional('OPS_SESSION_COOKIE') || 'ops_session';
}

export function getN8nHeaderSecret(): string {
  return required('N8N_HEADER_SECRET');
}

export function getOpsAdminEmails(): string[] {
  return required('OPS_ADMIN_EMAILS')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
