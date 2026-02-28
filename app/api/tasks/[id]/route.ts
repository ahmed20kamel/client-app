import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { updateTaskSchema } from '@/lib/validations/task';
import { z } from 'zod';

// GET /api/tasks/[id] - Get single task
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            color: true,
            icon: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        comments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permission (scope-based)
    const canViewAll = await can(session.user.id, 'task.view.all');
    const canViewOwn = await can(session.user.id, 'task.view.own', task);

    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permission (scope-based)
    const canEditAll = await can(session.user.id, 'task.edit.all');
    const canEditOwn = await can(session.user.id, 'task.edit.own', existingTask);

    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // If status is being changed to DONE, set completedAt
    const updateData: any = { ...validatedData };
    if (validatedData.status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (validatedData.status && validatedData.status !== 'DONE') {
      updateData.completedAt = null;
    }

    // If dueAt is being updated, check if it should be OVERDUE
    if (validatedData.dueAt) {
      const newDueDate = new Date(validatedData.dueAt);
      const now = new Date();
      if (newDueDate < now && updateData.status === 'OPEN') {
        updateData.status = 'OVERDUE';
      }
      updateData.dueAt = newDueDate;
    }

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Create status change comment if status changed
    if (validatedData.status && validatedData.status !== existingTask.status) {
      await prisma.taskComment.create({
        data: {
          taskId: id,
          userId: session.user.id,
          content: `Status changed from ${existingTask.status} to ${validatedData.status}`,
          type: 'STATUS_CHANGE',
          metadata: JSON.stringify({
            previousStatus: existingTask.status,
            newStatus: validatedData.status,
          }),
        },
      });
    }

    // Notify assignee if task was reassigned via regular update
    if (validatedData.assignedToId && validatedData.assignedToId !== existingTask.assignedToId) {
      await prisma.notification.create({
        data: {
          userId: validatedData.assignedToId,
          type: 'TASK_REASSIGNED',
          title: 'Task assigned to you',
          message: `Task "${task.title}" has been assigned to you`,
          link: `/en/tasks/${id}`,
        },
      });
    }

    // Log audit
    await logAudit({
      actorUserId: session.user.id,
      action: 'task.updated',
      entityType: 'Task',
      entityId: id,
      before: {
        title: existingTask.title,
        status: existingTask.status,
        priority: existingTask.priority,
        dueAt: existingTask.dueAt,
      },
      after: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt,
      },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
