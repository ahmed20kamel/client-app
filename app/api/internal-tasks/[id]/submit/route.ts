import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

// POST /api/internal-tasks/[id]/submit - Employee submits task for approval
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

    // Only assignee can submit
    if (task.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Task must be IN_PROGRESS or REJECTED
    if (task.status !== 'IN_PROGRESS' && task.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Task can only be submitted when in IN_PROGRESS or REJECTED status' },
        { status: 400 }
      );
    }

    // Update task status
    const updatedTask = await prisma.internalTask.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
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

    // Create SUBMISSION comment
    await prisma.internalTaskComment.create({
      data: {
        internalTaskId: id,
        userId: session.user.id,
        content: 'Task submitted for approval',
        type: 'SUBMISSION',
      },
    });

    // Notify creator
    await createNotification({
      userId: task.createdById,
      type: 'INTERNAL_TASK_SUBMITTED' as any,
      title: 'Task Submitted for Approval',
      message: `Task "${task.title}" has been submitted for your approval`,
      link: `/en/internal-tasks/${task.id}`,
    });

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    console.error('Submit internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
