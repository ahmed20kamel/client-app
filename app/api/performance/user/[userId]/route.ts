import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/performance/user/[userId] - Get performance data for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        jobTitle: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all performance reviews for this user
    const reviews = await prisma.performanceReview.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            jobTitle: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { periodEnd: 'desc' },
    });

    // Get stats
    const [totalTasks, completedTasksList, averageRatingResult, totalReviews] = await Promise.all([
      // Total internal tasks assigned to this user
      prisma.internalTask.count({
        where: { assignedToId: userId },
      }),
      // Completed tasks with dates for on-time calculation
      prisma.internalTask.findMany({
        where: {
          assignedToId: userId,
          status: { in: ['APPROVED', 'DONE'] },
        },
        select: { completedAt: true, dueAt: true },
      }),
      // Average rating from TaskRating
      prisma.taskRating.aggregate({
        where: { ratedUserId: userId },
        _avg: { rating: true },
      }),
      // Total reviews count
      prisma.performanceReview.count({
        where: { userId },
      }),
    ]);

    const completedTasks = completedTasksList.length;
    const onTimeTasks = completedTasksList.filter(
      (t) => !t.dueAt || !t.completedAt || t.completedAt <= t.dueAt
    ).length;
    const averageRating = averageRatingResult._avg.rating || 0;

    // Get recent ratings (last 10)
    const recentRatings = await prisma.taskRating.findMany({
      where: { ratedUserId: userId },
      include: {
        internalTask: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      data: {
        user,
        reviews,
        stats: {
          totalTasks,
          completedTasks,
          onTimeTasks,
          averageRating,
          totalReviews,
        },
        recentRatings,
      },
    });
  } catch (error) {
    console.error('Get user performance data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
