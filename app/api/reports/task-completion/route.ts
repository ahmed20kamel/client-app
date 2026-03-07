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

    // Build task where clause based on permissions
    const taskWhere: Record<string, unknown> = { ...dateFilter };
    if (!canViewAll) {
      taskWhere.assignedToId = session.user.id;
    }

    // Single aggregation query instead of N×3 queries
    const [taskStats, users] = await Promise.all([
      prisma.task.groupBy({
        by: ['assignedToId', 'status'],
        where: taskWhere,
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true },
      }),
    ]);

    // Also get on-time completion count
    const onTimeStats = await prisma.task.groupBy({
      by: ['assignedToId'],
      where: {
        ...taskWhere,
        status: 'DONE',
        completedAt: { not: null },
      },
      _count: { id: true },
    });

    // Build lookup maps
    const userMap = new Map(users.map(u => [u.id, u]));
    const onTimeMap = new Map(onTimeStats.map(s => [s.assignedToId, s._count.id]));

    // Aggregate stats per user
    const userStatsMap = new Map<string, { total: number; completed: number }>();
    for (const stat of taskStats) {
      if (!stat.assignedToId) continue;
      const existing = userStatsMap.get(stat.assignedToId) || { total: 0, completed: 0 };
      existing.total += stat._count.id;
      if (stat.status === 'DONE') {
        existing.completed += stat._count.id;
      }
      userStatsMap.set(stat.assignedToId, existing);
    }

    // Build results
    const stats = Array.from(userStatsMap.entries())
      .map(([userId, { total, completed }]) => {
        const user = userMap.get(userId);
        if (!user) return null;
        if (!canViewAll && userId !== session.user.id) return null;

        const completedOnTime = onTimeMap.get(userId) || 0;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        const onTimeRate = completed > 0 ? (completedOnTime / completed) * 100 : 0;

        return {
          user: { id: user.id, fullName: user.fullName },
          total,
          completed,
          completedOnTime,
          pending: total - completed,
          completionRate: Math.round(completionRate * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.completionRate - a.completionRate);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Task completion report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
