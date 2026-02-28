import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/:locale/login(.*)',
  '/:locale/forgot-password(.*)',
  '/:locale/reset-password(.*)',
  '/:locale/unauthorized(.*)',
  '/api/auth(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Skip for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Let API routes pass through (auth is handled per-route)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For protected routes, check if user is signed in
  if (!isPublicRoute(request)) {
    const { userId } = await auth();

    if (!userId) {
      // Determine locale from URL or default to 'en'
      const localeMatch = pathname.match(/^\/(en|ar)\//);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const signInUrl = new URL(`/${locale}/sign-in`, request.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Apply intl middleware for locale routing
  return intlMiddleware(request);
});

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
