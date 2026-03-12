import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { reassignTaskSchema } from '@/lib/validations/task';
import { z } from 'zod';

// POST /api/tasks/[id]/reassign - Reassign task to another user
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

    // Only users with task.edit.all can reassign
    const canEditAll = await can(session.user.id, 'task.edit.all');
    if (!canEditAll) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = reassignTaskSchema.parse(body);

    // Check new assignee exists
    const newAssignee = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId },
      select: { id: true, fullName: true },
    });

    if (!newAssignee) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    }

    const previousAssignee = task.assignedTo;

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { assignedToId: validatedData.assignedToId },
      include: {
        customer: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    // Create reassignment comment
    await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: session.user.id,
        content: validatedData.reason || `Reassigned from ${previousAssignee.fullName} to ${newAssignee.fullName}`,
        type: 'REASSIGNMENT',
        metadata: JSON.stringify({
          previousAssigneeId: previousAssignee.id,
          previousAssigneeName: previousAssignee.fullName,
          newAssigneeId: newAssignee.id,
          newAssigneeName: newAssignee.fullName,
        }),
      },
    });

    // Notify new assignee
    await prisma.notification.create({
      data: {
        userId: newAssignee.id,
        type: 'TASK_REASSIGNED',
        title: 'Task reassigned to you',
        message: `Task "${task.title}" has been reassigned to you`,
        link: `/en/tasks/${id}`,
      },
    });

    // Notify previous assignee
    if (previousAssignee.id !== newAssignee.id) {
      await prisma.notification.create({
        data: {
          userId: previousAssignee.id,
          type: 'TASK_REASSIGNED',
          title: 'Task reassigned',
          message: `Task "${task.title}" has been reassigned to ${newAssignee.fullName}`,
          link: `/en/tasks/${id}`,
        },
      });
    }

    // Audit log
    await logAudit({
      actorUserId: session.user.id,
      action: 'task.reassigned',
      entityType: 'Task',
      entityId: id,
      before: { assignedToId: previousAssignee.id, assignedToName: previousAssignee.fullName },
      after: { assignedToId: newAssignee.id, assignedToName: newAssignee.fullName },
    });

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Reassign task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
