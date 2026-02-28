import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createTaskCategorySchema } from '@/lib/validations/escalation';
import { z } from 'zod';

// GET /api/task-categories - List all task categories
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.taskCategory.findMany({
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Get task categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/task-categories - Create category (admin only)
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
    const validatedData = createTaskCategorySchema.parse(body);

    const category = await prisma.taskCategory.create({
      data: validatedData,
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create task category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
