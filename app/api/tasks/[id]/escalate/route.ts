import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { escalateTaskSchema } from '@/lib/validations/task';
import { z } from 'zod';

// POST /api/tasks/[id]/escalate - Manually escalate a task
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

    // Only users with task.edit.all can escalate
    const canEditAll = await can(session.user.id, 'task.edit.all');
    if (!canEditAll) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        department: { select: { id: true, managerId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = escalateTaskSchema.parse(body);

    const previousLevel = task.escalationLevel;

    // Update escalation level and priority
    const updateData: Record<string, unknown> = {
      escalationLevel: validatedData.escalationLevel,
    };

    // Auto-escalate priority if going to critical
    if (validatedData.escalationLevel === 2 && task.priority !== 'HIGH') {
      updateData.priority = 'HIGH';
    }

    const levelNames = ['Normal', 'Escalated', 'Critical'];

    // Atomically update task + create comment
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          category: { select: { id: true, name: true, nameAr: true } },
          department: { select: { id: true, name: true, nameAr: true } },
        },
      });

      await tx.taskComment.create({
        data: {
          taskId: id,
          userId: session.user.id,
          content: validatedData.reason,
          type: 'ESCALATION',
          metadata: JSON.stringify({
            previousLevel,
            newLevel: validatedData.escalationLevel,
            previousLevelName: levelNames[previousLevel],
            newLevelName: levelNames[validatedData.escalationLevel],
          }),
        },
      });

      return updated;
    });

    // Notifications — fire and forget
    if (task.assignedToId !== session.user.id) {
      prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: 'TASK_ESCALATED',
          title: 'Task escalated',
          message: `Task "${task.title}" has been escalated to ${levelNames[validatedData.escalationLevel]}`,
          link: `/tasks/${id}`,
        },
      }).catch((err) => console.error('Notification error:', err));
    }

    if (task.department?.managerId && task.department.managerId !== session.user.id) {
      prisma.notification.create({
        data: {
          userId: task.department.managerId,
          type: 'TASK_ESCALATED',
          title: 'Task escalated in your department',
          message: `Task "${task.title}" has been escalated to ${levelNames[validatedData.escalationLevel]}`,
          link: `/tasks/${id}`,
        },
      }).catch((err) => console.error('Notification error:', err));
    }

    // Audit log — fire and forget
    logAudit({
      actorUserId: session.user.id,
      action: 'task.escalated',
      entityType: 'Task',
      entityId: id,
      before: { escalationLevel: previousLevel },
      after: { escalationLevel: validatedData.escalationLevel, reason: validatedData.reason },
    }).catch((err) => console.error('Audit log error:', err));

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    console.error('Escalate task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
