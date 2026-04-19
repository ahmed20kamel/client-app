import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/roles/[id]/permissions — permissions list for a role (for preset loading)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await can(session.user.id, 'user.manage')))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId: id },
    include: { permission: { select: { name: true } } },
  });

  const permissionNames = rolePerms.map(rp => rp.permission.name);
  return NextResponse.json({ data: permissionNames });
}
