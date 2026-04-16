import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

const getJwtSecret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? '');

// Public routes that don't require authentication
const publicPaths = [
  '/login',
  '/forgot-password',
  '/reset-password',
];

// Routes that non-admin (Employee/Manager) users are allowed to access
const employeeAllowedPaths = [
  '/internal-tasks',
  '/profile',
  '/notifications',
  '/approvals',
  '/dashboard',
  '/tasks',
  '/performance',
];

function isPublicPath(pathname: string): boolean {
  // Root is public
  if (pathname === '/') return true;

  // Remove locale prefix to check the path
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';

  // Check if it's a public path
  return publicPaths.some((p) => pathWithoutLocale.startsWith(p));
}

function isEmployeeAllowedPath(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
  return employeeAllowedPaths.some((p) => pathWithoutLocale.startsWith(p));
}

async function getTokenPayload(token: string): Promise<{ role: string; id: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const role = payload.role as string;
    const id = payload.id as string;
    if (!role || !id) return null;
    return { role, id };
  } catch {
    return null;
  }
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
      const localeMatch = pathname.match(/^\/(en|ar)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const signInUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Decode token — if invalid/expired, force re-login
    const tokenPayload = await getTokenPayload(sessionCookie.value);
    if (!tokenPayload) {
      const localeMatch = pathname.match(/^\/(en|ar)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const signInUrl = new URL(`/${locale}/login`, request.url);
      const response = NextResponse.redirect(signInUrl);
      response.cookies.delete('crm-session');
      return response;
    }

    // Check role-based access: non-admin users can only access allowed paths
    const { role } = tokenPayload;
    if (role !== 'Admin' && !isPublicPath(pathname) && !isEmployeeAllowedPath(pathname)) {
      const localeMatch = pathname.match(/^\/(en|ar)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const redirectUrl = new URL(`/${locale}/internal-tasks`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Apply intl middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
