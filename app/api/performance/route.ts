import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPerformanceReviewSchema } from '@/lib/validations/internal-task';
import { z } from 'zod';

// GET /api/performance - List performance reviews with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const userId = searchParams.get('userId') || '';
    const reviewerId = searchParams.get('reviewerId') || '';
    const period = searchParams.get('period') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (period) {
      where.period = period;
    }

    if (status) {
      where.status = status;
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.performanceReview.count({ where }),
    ]);

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get performance reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/performance - Create performance review
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPerformanceReviewSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Count completed internal tasks for the user in the period
    const tasks = await prisma.internalTask.findMany({
      where: {
        assignedToId: validatedData.userId,
        status: { in: ['APPROVED', 'DONE'] },
        completedAt: {
          gte: new Date(validatedData.periodStart),
          lte: new Date(validatedData.periodEnd),
        },
      },
      select: { completedAt: true, dueAt: true },
    });

    const completedTasks = tasks.length;
    const onTimeTasks = tasks.filter(
      (t) => !t.dueAt || !t.completedAt || t.completedAt <= t.dueAt
    ).length;

    // Calculate average rating from TaskRating
    const ratings = await prisma.taskRating.aggregate({
      where: {
        ratedUserId: validatedData.userId,
        createdAt: {
          gte: new Date(validatedData.periodStart),
          lte: new Date(validatedData.periodEnd),
        },
      },
      _avg: { rating: true },
    });
    const avgRating = ratings._avg.rating || 0;

    // Create performance review
    const review = await prisma.performanceReview.create({
      data: {
        userId: validatedData.userId,
        reviewerId: session.user.id,
        period: validatedData.period,
        periodStart: new Date(validatedData.periodStart),
        periodEnd: new Date(validatedData.periodEnd),
        overallRating: validatedData.overallRating,
        strengths: validatedData.strengths,
        improvements: validatedData.improvements,
        notes: validatedData.notes,
        tasksCompleted: completedTasks,
        tasksOnTime: onTimeTasks,
        averageRating: avgRating,
      },
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
    });

    // Send notification to the reviewed user
    await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        type: 'SYSTEM',
        title: 'Performance Review',
        message: `A new ${validatedData.period.toLowerCase()} performance review has been created for you`,
        link: `/en/performance/${review.id}`,
      },
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Create performance review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
