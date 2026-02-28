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
    const where: any = {
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

    // Get count by status for all pipeline stages
    const statusCounts = await Promise.all(
      LEAD_STATUSES.map(async (status) => {
        const count = await prisma.customer.count({ where: { ...where, status } });
        return { status, count };
      })
    );

    const total = statusCounts.reduce((sum, s) => sum + s.count, 0);

    // Build funnel data
    const funnel = statusCounts.map(({ status, count }) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      probability: STATUS_PROBABILITY_MAP[status],
    }));

    // Get value aggregates by status
    const allCustomers = await prisma.customer.findMany({
      where,
      select: {
        status: true,
        estimatedValue: true,
        weightedValue: true,
      },
    });

    const valueByStatus = LEAD_STATUSES.reduce((acc, status) => {
      const customersInStatus = allCustomers.filter(c => c.status === status);
      acc[status] = {
        estimatedTotal: customersInStatus.reduce((sum, c) => sum + (c.estimatedValue || 0), 0),
        weightedTotal: customersInStatus.reduce((sum, c) => sum + (c.weightedValue || 0), 0),
      };
      return acc;
    }, {} as Record<string, { estimatedTotal: number; weightedTotal: number }>);

    // Calculate summary
    const won = statusCounts.find(s => s.status === 'WON')?.count || 0;
    const lost = statusCounts.find(s => s.status === 'LOST')?.count || 0;
    const successRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0;

    const totalEstimatedValue = allCustomers.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
    const totalWeightedValue = allCustomers.reduce((sum, c) => sum + (c.weightedValue || 0), 0);

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
