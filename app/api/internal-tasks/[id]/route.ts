import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/permissions';
import { updateInternalTaskSchema } from '@/lib/validations/internal-task';
import { z } from 'zod';

// GET /api/internal-tasks/[id] - Get single internal task
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

    const task = await prisma.internalTask.findUnique({
      where: { id },
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
        approvedBy: {
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
        rating: {
          include: {
            ratedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Get internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/internal-tasks/[id] - Update internal task
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
    const existingTask = await prisma.internalTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Creator, assignee, or admin can update
    const isAdmin = await hasRole(session.user.id, 'Admin');
    const isCreator = existingTask.createdById === session.user.id;
    const isAssignee = existingTask.assignedToId === session.user.id;
    if (!isCreator && !isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateInternalTaskSchema.parse(body);

    // Build update data
    const updateData: any = { ...validatedData };

    if (validatedData.dueAt !== undefined) {
      updateData.dueAt = validatedData.dueAt ? new Date(validatedData.dueAt) : null;
    }

    // Update task
    const task = await prisma.internalTask.update({
      where: { id },
      data: updateData,
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

    // Create SYSTEM comment for changes
    const changes: string[] = [];
    if (validatedData.title && validatedData.title !== existingTask.title) {
      changes.push(`Title changed to "${validatedData.title}"`);
    }
    if (validatedData.priority && validatedData.priority !== existingTask.priority) {
      changes.push(`Priority changed from ${existingTask.priority} to ${validatedData.priority}`);
    }
    if (validatedData.assignedToId && validatedData.assignedToId !== existingTask.assignedToId) {
      changes.push('Assignee changed');
    }
    if (validatedData.dueAt !== undefined && String(validatedData.dueAt) !== String(existingTask.dueAt)) {
      changes.push('Due date updated');
    }

    if (changes.length > 0) {
      await prisma.internalTaskComment.create({
        data: {
          internalTaskId: id,
          userId: session.user.id,
          content: changes.join('. '),
          type: 'SYSTEM',
        },
      });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal-tasks/[id] - Delete internal task
export async function DELETE(
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
    const task = await prisma.internalTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator or admin can delete
    const isAdmin = await hasRole(session.user.id, 'Admin');
    if (task.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.internalTask.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete internal task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
