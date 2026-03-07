import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/permissions';
import { rejectTaskSchema } from '@/lib/validations/internal-task';
import { createNotification } from '@/lib/notifications';
import { z } from 'zod';

// POST /api/internal-tasks/[id]/reject - Manager rejects task
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

    // Only creator or admin can reject
    const isAdmin = await hasRole(session.user.id, 'Admin');
    if (task.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Task must be SUBMITTED
    if (task.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Task can only be rejected when in SUBMITTED status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = rejectTaskSchema.parse(body);

    // Update task status to REJECTED
    const updatedTask = await prisma.internalTask.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: validatedData.rejectionReason,
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

    // Create REJECTION comment with reason
    await prisma.internalTaskComment.create({
      data: {
        internalTaskId: id,
        userId: session.user.id,
        content: `Task rejected: ${validatedData.rejectionReason}`,
        type: 'REJECTION',
      },
    });

    // Notify assignee
    await createNotification({
      userId: task.assignedToId,
      type: 'INTERNAL_TASK_REJECTED',
      title: 'Task Rejected',
      message: `Your task "${task.title}" has been rejected: ${validatedData.rejectionReason}`,
      link: `/en/internal-tasks/${task.id}`,
    });

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Reject internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
