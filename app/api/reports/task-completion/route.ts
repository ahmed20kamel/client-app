import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/reports/task-completion - Task completion rate report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Check permissions
    const canViewAll = await can(session.user.id, 'task.view.all');

    // Date range
    const dateFilter = from && to
      ? {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }
      : {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        };

    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    // Get task stats for each user
    const stats = await Promise.all(
      users.map(async (user) => {
        const taskWhere = canViewAll
          ? { assignedToId: user.id, ...dateFilter }
          : session.user.id === user.id
          ? { assignedToId: user.id, ...dateFilter }
          : null;

        if (!taskWhere) {
          return null;
        }

        const [total, completed, completedOnTime] = await Promise.all([
          prisma.task.count({ where: taskWhere }),
          prisma.task.count({
            where: { ...taskWhere, status: 'DONE' },
          }),
          prisma.task.count({
            where: {
              ...taskWhere,
              status: 'DONE',
              completedAt: { not: null },
              AND: [
                { completedAt: { not: null } },
              ],
            },
          }),
        ]);

        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        const onTimeRate = completed > 0 ? (completedOnTime / completed) * 100 : 0;

        return {
          user: {
            id: user.id,
            fullName: user.fullName,
          },
          total,
          completed,
          completedOnTime,
          pending: total - completed,
          completionRate: Math.round(completionRate * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
        };
      })
    );

    // Filter out nulls and sort by completion rate
    const validStats = stats
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.completionRate - a.completionRate);

    return NextResponse.json({ data: validStats });
  } catch (error) {
    console.error('Task completion report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
