import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createDepartmentSchema } from '@/lib/validations/escalation';
import { z } from 'zod';

// GET /api/departments - List all departments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        manager: { select: { id: true, fullName: true } },
        _count: { select: { users: true, tasks: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: departments });
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/departments - Create department (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = await can(session.user.id, 'user.manage');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createDepartmentSchema.parse(body);

    const department = await prisma.department.create({
      data: validatedData,
      include: {
        parent: { select: { id: true, name: true, nameAr: true } },
        manager: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
