import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/permissions — all permissions from DB, grouped by resource
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await can(session.user.id, 'user.manage')))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });

  return NextResponse.json({ data: permissions });
}
