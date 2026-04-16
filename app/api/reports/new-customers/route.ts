import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/reports/new-customers - New customers report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const groupBy = searchParams.get('groupBy') || 'day';

    // Check permissions
    const canViewAll = await can(session.user.id, 'customer.view.all');

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Scope-based filtering
    if (!canViewAll) {
      where.ownerId = session.user.id;
    }

    // Date range
    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    } else {
      // Default: last 30 days
      where.createdAt = {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      };
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get new customers
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          owner: {
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
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.customer.count({ where }),
    ]);

    // Group by date
    const grouped: Record<string, typeof customers> = {};

    customers.forEach((customer) => {
      const date = new Date(customer.createdAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(customer);
    });

    return NextResponse.json({
      data: {
        customers,
        grouped,
        summary: Object.keys(grouped).map((date) => ({
          date,
          count: grouped[date].length,
        })),
      },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('New customers report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
