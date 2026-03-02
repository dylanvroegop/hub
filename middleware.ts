import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PAGE_PATHS = new Set(['/login']);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const hasSessionCookie = Boolean(request.cookies.get(process.env.OPS_SESSION_COOKIE || 'ops_session')?.value);
  if (!hasSessionCookie) {
    const target = new URL('/login', request.url);
    target.searchParams.set('next', pathname);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
