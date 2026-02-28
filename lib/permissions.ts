import { prisma } from './prisma';

export async function getUserPermissions(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  return userRoles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission)
  );
}

export async function can(
  userId: string,
  permission: string,
  resource?: any
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);

  const hasPermission = userPermissions.some((p) => p.name === permission);

  if (!hasPermission) return false;

  // If permission has .own scope, check ownership
  if (permission.includes('.own') && resource) {
    return (
      resource.ownerId === userId ||
      resource.assignedToId === userId ||
      resource.createdById === userId
    );
  }

  return true;
}

export async function requirePermission(
  userId: string,
  permission: string,
  resource?: any
) {
  const allowed = await can(userId, permission, resource);
  if (!allowed) {
    throw new Error('Forbidden');
  }
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: roleName,
      },
    },
  });

  return !!userRole;
}
