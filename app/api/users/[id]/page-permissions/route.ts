import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { PAGE_PERMISSIONS } from '@/lib/permissions';

// GET /api/users/[id]/page-permissions
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
    include: { permission: true },
  });

  const granted = records
    .filter((r) => r.permission.name.startsWith('page.'))
    .map((r) => r.permission.name);

  return NextResponse.json({ data: granted });
}

// PATCH /api/users/[id]/page-permissions
// Body: { pages: string[] }  — full replacement of page permissions
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
  const pages: string[] = Array.isArray(body.pages) ? body.pages : [];

  const validNames = new Set(PAGE_PERMISSIONS.map((p) => p.name));
  const safePages = pages.filter((p) => validNames.has(p as any));

  // Ensure all page permissions exist in the Permission table (upsert)
  await Promise.all(
    safePages.map((name) => {
      const meta = PAGE_PERMISSIONS.find((p) => p.name === name)!;
      return prisma.permission.upsert({
        where: { name },
        update: {},
        create: {
          name,
          resource: 'page',
          action: 'view',
          description: `Access ${meta.label} page`,
        },
      });
    })
  );

  // Get permission IDs for the requested pages
  const permissions = await prisma.permission.findMany({
    where: { name: { in: safePages } },
  });

  // Delete all existing page permissions for this user, then re-create
  const allPageNames = Array.from(validNames);
  const existingPagePerms = await prisma.permission.findMany({
    where: { name: { in: allPageNames } },
    select: { id: true },
  });
  const existingIds = existingPagePerms.map((p) => p.id);

  await prisma.userPermission.deleteMany({
    where: { userId, permissionId: { in: existingIds } },
  });

  if (permissions.length > 0) {
    await prisma.userPermission.createMany({
      data: permissions.map((p) => ({ userId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true });
}
