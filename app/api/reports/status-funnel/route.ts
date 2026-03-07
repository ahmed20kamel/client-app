import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { LEAD_STATUSES, STATUS_PROBABILITY_MAP } from '@/lib/validations/customer';

// GET /api/reports/status-funnel - Lead pipeline funnel report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId') || '';
    const customerType = searchParams.get('customerType') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Check permissions
    const canViewAll = await can(session.user.id, 'customer.view.all');

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Scope-based filtering
    if (!canViewAll) {
      where.ownerId = session.user.id;
    } else if (ownerId) {
      where.ownerId = ownerId;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    // Date range
    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    // Single groupBy query instead of N separate count queries
    const [statusGroups, valueAggregates] = await Promise.all([
      prisma.customer.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.customer.groupBy({
        by: ['status'],
        where,
        _sum: {
          estimatedValue: true,
          weightedValue: true,
        },
      }),
    ]);

    // Build lookup maps
    const countMap = new Map(statusGroups.map(g => [g.status, g._count.id]));
    const valueMap = new Map(valueAggregates.map(g => [g.status, {
      estimatedTotal: g._sum.estimatedValue || 0,
      weightedTotal: g._sum.weightedValue || 0,
    }]));

    const total = statusGroups.reduce((sum, g) => sum + g._count.id, 0);

    // Build funnel data
    const funnel = LEAD_STATUSES.map((status) => {
      const count = countMap.get(status) || 0;
      return {
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        probability: STATUS_PROBABILITY_MAP[status],
      };
    });

    const valueByStatus = LEAD_STATUSES.reduce((acc, status) => {
      acc[status] = valueMap.get(status) || { estimatedTotal: 0, weightedTotal: 0 };
      return acc;
    }, {} as Record<string, { estimatedTotal: number; weightedTotal: number }>);

    // Calculate summary
    const won = countMap.get('WON') || 0;
    const lost = countMap.get('LOST') || 0;
    const successRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0;

    const totalEstimatedValue = valueAggregates.reduce((sum, g) => sum + (g._sum.estimatedValue || 0), 0);
    const totalWeightedValue = valueAggregates.reduce((sum, g) => sum + (g._sum.weightedValue || 0), 0);

    return NextResponse.json({
      data: {
        funnel,
        valueByStatus,
        summary: {
          total,
          won,
          lost,
          successRate: Math.round(successRate * 10) / 10,
          totalEstimatedValue,
          totalWeightedValue,
        },
      },
    });
  } catch (error) {
    console.error('Status funnel report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
