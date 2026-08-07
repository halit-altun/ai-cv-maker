import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE_NAME = 'cvai_access_token';
const REFRESH_COOKIE_NAME = 'cvai_refresh_token';

export function middleware(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
  const hasRefreshToken = Boolean(request.cookies.get(REFRESH_COOKIE_NAME)?.value);

  if (!hasAccessToken && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/my-cvs/:path*',
    '/company-based-cv-editor/:path*',
    '/outreach-logs/:path*',
    '/outreach-projects/:path*',
    '/mail-tracking/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
};
