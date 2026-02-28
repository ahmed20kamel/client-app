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
 * Maps Clerk userId to our database User and returns a session
 * compatible with the existing codebase (session.user.id, session.user.role, etc.)
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
        // Link the existing user to Clerk
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: userId,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Create a new user from Clerk data
        const adminRole = await prisma.role.findUnique({
          where: { name: 'Employee' },
        });

        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email,
            fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email,
            lastLoginAt: new Date(),
            roles: adminRole
              ? {
                  create: {
                    roleId: adminRole.id,
                  },
                }
              : undefined,
          },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });
      }
    }

    if (user.status === 'DISABLED') {
      return null;
    }

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
