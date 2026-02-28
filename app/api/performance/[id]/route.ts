import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/permissions';
import { updatePerformanceReviewSchema } from '@/lib/validations/internal-task';
import { z } from 'zod';

// GET /api/performance/[id] - Get single performance review
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

    const review = await prisma.performanceReview.findUnique({
      where: { id },
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
            email: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
    }

    return NextResponse.json({ data: review });
  } catch (error) {
    console.error('Get performance review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/performance/[id] - Update performance review
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

    // Check if review exists
    const existingReview = await prisma.performanceReview.findUnique({
      where: { id },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
    }

    // Only the reviewer can update
    if (existingReview.reviewerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updatePerformanceReviewSchema.parse(body);

    const review = await prisma.performanceReview.update({
      where: { id },
      data: validatedData,
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
            email: true,
            jobTitle: true,
          },
        },
      },
    });

    return NextResponse.json({ data: review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update performance review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/performance/[id] - Delete performance review
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

    // Check if review exists
    const review = await prisma.performanceReview.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
    }

    // Only the reviewer or admin can delete
    const isAdmin = await hasRole(session.user.id, 'admin');
    if (review.reviewerId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.performanceReview.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Performance review deleted successfully' });
  } catch (error) {
    console.error('Delete performance review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
