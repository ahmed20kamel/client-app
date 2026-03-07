import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/permissions';
import { rateTaskSchema } from '@/lib/validations/internal-task';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';

// POST /api/internal-tasks/[id]/rate - Rate employee after task approval
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
    const task = await prisma.internalTask.findUnique({
      where: { id },
      include: { rating: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator or admin can rate
    const isAdmin = await hasRole(session.user.id, 'Admin');
    if (task.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Task must be APPROVED or DONE
    if (task.status !== 'APPROVED' && task.status !== 'DONE') {
      return NextResponse.json(
        { error: 'Task can only be rated when in APPROVED or DONE status' },
        { status: 400 }
      );
    }

    // Task must not already have a rating
    if (task.rating) {
      return NextResponse.json(
        { error: 'Task has already been rated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = rateTaskSchema.parse(body);

    // Create TaskRating record
    const rating = await prisma.taskRating.create({
      data: {
        internalTaskId: id,
        ratedById: session.user.id,
        ratedUserId: task.assignedToId,
        rating: validatedData.rating,
        comment: validatedData.comment,
      },
      include: {
        ratedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Notify assignee
    await createNotification({
      userId: task.assignedToId,
      type: 'INTERNAL_TASK_RATED',
      title: 'Task Rated',
      message: `Your task "${task.title}" has been rated ${validatedData.rating}/5`,
      link: `/en/internal-tasks/${task.id}`,
    });

    return NextResponse.json({ data: rating }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Rate internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
