import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createInternalTaskSchema } from '@/lib/validations/internal-task';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';

// GET /api/internal-tasks - List internal tasks with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const assignedToId = searchParams.get('assignedToId') || '';
    const categoryId = searchParams.get('categoryId') || '';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get tasks with pagination
    const [tasks, total] = await Promise.all([
      prisma.internalTask.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              fullName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              color: true,
            },
          },
          rating: true,
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.internalTask.count({ where }),
    ]);

    return NextResponse.json({
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get internal tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/internal-tasks - Create new internal task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createInternalTaskSchema.parse(body);

    // Check if assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId },
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 404 }
      );
    }

    // Create task
    const task = await prisma.internalTask.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        assignedToId: validatedData.assignedToId,
        createdById: session.user.id,
        departmentId: validatedData.departmentId,
        categoryId: validatedData.categoryId,
        priority: validatedData.priority,
        dueAt: validatedData.dueAt ? new Date(validatedData.dueAt) : null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            color: true,
          },
        },
        rating: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    // Create SYSTEM comment for task creation
    await prisma.internalTaskComment.create({
      data: {
        internalTaskId: task.id,
        userId: session.user.id,
        content: 'Task created',
        type: 'SYSTEM',
      },
    });

    // Send notification to assignee (if not self-assigned)
    if (task.assignedToId !== session.user.id) {
      await createNotification({
        userId: task.assignedToId,
        type: 'INTERNAL_TASK_ASSIGNED',
        title: 'New Internal Task',
        message: `You have been assigned: "${task.title}"`,
        link: `/en/internal-tasks/${task.id}`,
      });
    }

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Create internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
