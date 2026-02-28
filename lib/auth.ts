import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  user: SessionUser;
}

/**
 * Server-side auth function that wraps Clerk's auth.
 * Maps Clerk userId to our database User and returns a session.
 *
 * IMPORTANT: Only users who are pre-registered in the database can access the app.
 * If a Clerk user's email is not found in the DB, auth() returns null (unauthorized).
 */
export async function auth(): Promise<Session | null> {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return null;
    }

    // Try to find user by clerkId first
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // If not found by clerkId, try to find by email and link them
    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
        return null;
      }

      const email = clerkUser.emailAddresses[0].emailAddress;
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (user) {
        // Link the existing DB user to Clerk
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: userId,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Email NOT found in DB → user is not authorized
        return null;
      }
    }

    if (user.status === 'DISABLED') {
      return null;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.roles[0]?.role.name || 'Employee',
      },
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Check if a Clerk user is authorized (exists in our DB).
 * Used by the unauthorized page to determine the reason.
 */
export async function checkUserAuthorization(): Promise<{
  isSignedIn: boolean;
  isAuthorized: boolean;
  email: string | null;
}> {
  try {
    const { userId } = await clerkAuth();

    if (!userId) {
      return { isSignedIn: false, isAuthorized: false, email: null };
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || null;

    if (!email) {
      return { isSignedIn: true, isAuthorized: false, email: null };
    }

    // Check if user exists in DB by clerkId or email
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkId: userId },
          { email },
        ],
        status: 'ACTIVE',
      },
    });

    return {
      isSignedIn: true,
      isAuthorized: !!dbUser,
      email,
    };
  } catch {
    return { isSignedIn: false, isAuthorized: false, email: null };
  }
}
