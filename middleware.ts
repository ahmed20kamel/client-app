import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Public routes that don't require authentication
const publicPaths = [
  '/login',
  '/forgot-password',
  '/reset-password',
];

function isPublicPath(pathname: string): boolean {
  // Root is public
  if (pathname === '/') return true;

  // Remove locale prefix to check the path
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';

  // Check if it's a public path
  return publicPaths.some((p) => pathWithoutLocale.startsWith(p));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (!isPublicPath(pathname)) {
    const sessionCookie = request.cookies.get('crm-session');

    if (!sessionCookie?.value) {
      // Determine locale from URL or default to 'en'
      const localeMatch = pathname.match(/^\/(en|ar)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const signInUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Apply intl middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
