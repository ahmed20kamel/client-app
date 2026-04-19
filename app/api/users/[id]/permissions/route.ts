import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/users/[id]/permissions — all direct permissions for a user
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await can(session.user.id, 'user.manage')))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const records = await prisma.userPermission.findMany({
    where: { userId: id },
    include: { permission: { select: { name: true } } },
  });

  return NextResponse.json({ data: records.map(r => r.permission.name) });
}

// PATCH /api/users/[id]/permissions — replace all direct permissions
// Body: { permissions: string[] }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await can(session.user.id, 'user.manage')))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;
  const body = await req.json();
  const permNames: string[] = Array.isArray(body.permissions) ? body.permissions : [];

  // Upsert all requested permissions (in case some don't exist yet in DB)
  // This handles page.* permissions that get created on-the-fly
  for (const name of permNames) {
    const existing = await prisma.permission.findUnique({ where: { name } });
    if (!existing) {
      const [resource, action, scope] = name.split('.');
      await prisma.permission.create({
        data: {
          name,
          resource: resource || name,
          action:   action   || 'view',
          scope:    scope    || null,
          description: name,
        },
      });
    }
  }

  // Fetch permission records for all requested names
  const permissions = await prisma.permission.findMany({
    where: { name: { in: permNames } },
  });

  // Replace all direct permissions for this user
  await prisma.userPermission.deleteMany({ where: { userId } });

  if (permissions.length > 0) {
    await prisma.userPermission.createMany({
      data: permissions.map(p => ({ userId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true, count: permissions.length });
}
