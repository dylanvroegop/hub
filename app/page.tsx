import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionCookieName } from '@/lib/env';

export default function HomePage() {
  const hasCookie = Boolean(cookies().get(getSessionCookieName())?.value);
  redirect(hasCookie ? '/dashboard' : '/login');
}
