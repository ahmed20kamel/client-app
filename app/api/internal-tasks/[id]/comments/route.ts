import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { internalTaskCommentSchema } from '@/lib/validations/internal-task';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';

// GET /api/internal-tasks/[id]/comments - List comments for task
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

    // Check task exists
    const task = await prisma.internalTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comments = await prisma.internalTaskComment.findMany({
      where: { internalTaskId: id },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('Get internal task comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/internal-tasks/[id]/comments - Add comment
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

    // Check task exists
    const task = await prisma.internalTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // User must be assignee or creator
    if (task.assignedToId !== session.user.id && task.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = internalTaskCommentSchema.parse(body);

    const comment = await prisma.internalTaskComment.create({
      data: {
        internalTaskId: id,
        userId: session.user.id,
        content: validatedData.content,
        type: 'COMMENT',
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Notify the other party (if commenter is assignee, notify creator and vice versa)
    const notifyUserId = session.user.id === task.assignedToId
      ? task.createdById
      : task.assignedToId;

    if (notifyUserId !== session.user.id) {
      await createNotification({
        userId: notifyUserId,
        type: 'INTERNAL_TASK_COMMENT' as any,
        title: 'New Comment on Internal Task',
        message: `New comment on "${task.title}"`,
        link: `/en/internal-tasks/${task.id}`,
      });
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Create internal task comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
