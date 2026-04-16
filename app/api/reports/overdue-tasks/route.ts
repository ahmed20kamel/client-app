import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/reports/overdue-tasks - Overdue tasks report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignedToId = searchParams.get('assignedToId') || '';
    const customerType = searchParams.get('customerType') || '';
    const priority = searchParams.get('priority') || '';

    // Check permissions
    const canViewAll = await can(session.user.id, 'task.view.all');

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'OVERDUE',
    };

    // Scope-based filtering
    if (!canViewAll) {
      where.assignedToId = session.user.id;
    } else if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (priority) {
      where.priority = priority;
    }

    if (customerType) {
      where.customer = {
        customerType,
      };
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get overdue tasks
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              customerType: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { dueAt: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      data: tasks,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Overdue tasks report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
