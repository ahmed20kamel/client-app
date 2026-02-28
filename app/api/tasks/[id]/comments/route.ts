import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { taskCommentSchema } from '@/lib/validations/task';
import { z } from 'zod';

// GET /api/tasks/[id]/comments - Get task comments/activity log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check task exists and user has access
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const canViewAll = await can(session.user.id, 'task.view.all');
    const canViewOwn = await can(session.user.id, 'task.view.own', task);
    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const [comments, total] = await Promise.all([
      prisma.taskComment.findMany({
        where: { taskId: id },
        include: {
          user: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taskComment.count({ where: { taskId: id } }),
    ]);

    return NextResponse.json({
      data: comments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get task comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - Add comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check task exists and user has access
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const canViewAll = await can(session.user.id, 'task.view.all');
    const canViewOwn = await can(session.user.id, 'task.view.own', task);
    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = taskCommentSchema.parse(body);

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: session.user.id,
        content: validatedData.content,
        type: validatedData.type || 'COMMENT',
        metadata: validatedData.metadata,
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Notify task assignee if commenter is not the assignee
    if (task.assignedToId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: 'TASK_COMMENT',
          title: 'New comment on your task',
          message: `New comment on "${task.title}"`,
          link: `/en/tasks/${id}`,
        },
      });
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create task comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
