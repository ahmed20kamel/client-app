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
  '/en/sign-in(.*)',
  '/ar/sign-in(.*)',
  '/en/sign-up(.*)',
  '/ar/sign-up(.*)',
  '/en/login(.*)',
  '/ar/login(.*)',
  '/en/forgot-password(.*)',
  '/ar/forgot-password(.*)',
  '/en/reset-password(.*)',
  '/ar/reset-password(.*)',
  '/api/auth(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Skip Clerk for API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Apply intl middleware for locale routing
  return intlMiddleware(request);
});

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
