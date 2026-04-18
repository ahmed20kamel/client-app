import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImage?: string | null;
  pagePermissions: string[];
}

export interface Session {
  user: SessionUser;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '');
const COOKIE_NAME = 'crm-session';

/**
 * Create a JWT token for the user
 */
export async function createSessionToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Server-side auth function.
 * Reads the JWT from cookies, verifies it, and returns the session.
 */
export async function auth(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const userId = payload.id as string;
    if (!userId) return null;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
        directPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!user || user.status === 'DISABLED') {
      return null;
    }

    const pagePermissions = user.directPermissions
      .map((up) => up.permission.name)
      .filter((name) => name.startsWith('page.'));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.roles[0]?.role.name || 'Employee',
        profileImage: user.profileImage,
        pagePermissions,
      },
    };
  } catch {
    return null;
  }
}
