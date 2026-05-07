import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/attachments/link-task - Link temp attachments to an internal task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tempSessionId, internalTaskId } = await request.json();

    if (!tempSessionId || !internalTaskId) {
      return NextResponse.json({ error: 'tempSessionId and internalTaskId are required' }, { status: 400 });
    }

    const task = await prisma.internalTask.findUnique({
      where: { id: internalTaskId },
      select: { id: true, assignedToId: true, createdById: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'Admin';
    const isRelated = task.assignedToId === session.user.id || task.createdById === session.user.id;
    if (!isAdmin && !isRelated) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await prisma.attachment.updateMany({
      where: { tempSessionId },
      data: { internalTaskId, tempSessionId: null },
    });

    return NextResponse.json({ data: { linked: result.count } });
  } catch (error) {
    console.error('Link task attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
