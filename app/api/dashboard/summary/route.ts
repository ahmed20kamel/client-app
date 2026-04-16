import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/dashboard/summary - Get dashboard summary statistics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const canViewAll = await can(userId, 'customer.view.all');

    // Build where clause for scope
    const customerWhere = canViewAll ? {} : { ownerId: userId };
    const taskWhere = canViewAll ? {} : { assignedToId: userId };

    // Update overdue tasks first
    await prisma.task.updateMany({
      where: {
        status: 'OPEN',
        dueAt: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });

    // Financial date range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get statistics
    const [
      totalCustomers,
      myCustomers,
      openTasks,
      overdueTasks,
      completedThisWeek,
      customersNoTasks,
      customersNotUpdated,
      tasksToday,
      recentInternalTasks,
      pendingApprovals,
      employeeDistribution,
      invoicedThisMonth,
      outstandingInvoices,
      quotationStats,
      activeProductsCount,
      totalClientsCount,
      pendingQuotationsCount,
    ] = await Promise.all([
      // Total customers (all if admin, own if employee)
      prisma.customer.count({
        where: { ...customerWhere, deletedAt: null },
      }),

      // My customers (always own)
      prisma.customer.count({
        where: { ownerId: userId, deletedAt: null },
      }),

      // Open tasks
      prisma.task.count({
        where: { ...taskWhere, status: 'OPEN' },
      }),

      // Overdue tasks
      prisma.task.count({
        where: { ...taskWhere, status: 'OVERDUE' },
      }),

      // Completed this week
      prisma.task.count({
        where: {
          ...taskWhere,
          status: 'DONE',
          completedAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),

      // Customers with no open tasks
      prisma.customer.findMany({
        where: {
          ...customerWhere,
          deletedAt: null,
          tasks: {
            none: {
              status: { in: ['OPEN', 'OVERDUE'] },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          owner: {
            select: {
              fullName: true,
            },
          },
        },
        take: 10,
      }),

      // Customers not updated in 7+ days
      prisma.customer.findMany({
        where: {
          ...customerWhere,
          deletedAt: null,
          updatedAt: {
            lt: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
        select: {
          id: true,
          fullName: true,
          updatedAt: true,
          owner: {
            select: {
              fullName: true,
            },
          },
        },
        take: 10,
      }),

      // Tasks due today
      prisma.task.findMany({
        where: {
          ...taskWhere,
          status: { in: ['OPEN', 'OVERDUE'] },
          dueAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
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
        take: 10,
      }),

      // Recent internal tasks (assigned to user or all if admin)
      prisma.internalTask.findMany({
        where: {
          ...(canViewAll ? {} : { assignedToId: userId }),
          status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueAt: true,
          createdAt: true,
          assignedTo: { select: { id: true, fullName: true } },
          createdBy: { select: { fullName: true } },
        },
        orderBy: { dueAt: 'asc' },
        take: 8,
      }),

      // Pending approvals count (admin only)
      canViewAll
        ? prisma.internalTask.count({ where: { status: 'SUBMITTED' } })
        : prisma.internalTask.count({ where: { status: 'SUBMITTED', createdById: userId } }),

      // Employee distribution (admin only)
      canViewAll
        ? prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              fullName: true,
              jobTitle: true,
              _count: {
                select: {
                  ownedCustomers: { where: { deletedAt: null } },
                  assignedTasks: { where: { status: { in: ['OPEN', 'OVERDUE'] } } },
                  assignedInternalTasks: { where: { status: 'DONE' } },
                },
              },
            },
            orderBy: { ownedCustomers: { _count: 'desc' } },
          })
        : [],

      // Total invoiced this month (Admin only)
      canViewAll
        ? prisma.taxInvoice.aggregate({
            where: { createdAt: { gte: monthStart, lte: monthEnd } },
            _sum: { total: true },
          })
        : null,

      // Total outstanding across all invoices (Admin only)
      canViewAll
        ? prisma.taxInvoice.aggregate({
            where: { status: { in: ['UNPAID', 'PARTIAL'] } },
            _sum: { total: true, paidAmount: true },
          })
        : null,

      // Quotation conversion stats (Admin only) — last 90 days
      canViewAll
        ? prisma.quotation.groupBy({
            by: ['status'],
            where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            _count: { id: true },
          })
        : null,

      // Active products count (Admin only)
      canViewAll
        ? prisma.product.count({ where: { status: 'ACTIVE' } })
        : null,

      // Total clients count (Admin only)
      canViewAll
        ? prisma.client.count({ where: { status: 'ACTIVE' } })
        : null,

      // Pending quotations count (Admin only)
      canViewAll
        ? prisma.quotation.count({ where: { status: { in: ['DRAFT', 'SENT'] } } })
        : null,
    ]);

    // Compute financial KPIs
    const invoicedThisMonthTotal = invoicedThisMonth?._sum?.total ?? 0;
    const outstandingTotal = outstandingInvoices
      ? (outstandingInvoices._sum.total ?? 0) - (outstandingInvoices._sum.paidAmount ?? 0)
      : 0;

    // Conversion rate: CONFIRMED / (all non-DRAFT)
    let quotationConversionRate: number | null = null;
    if (quotationStats) {
      const total90 = quotationStats.reduce((s, g) => s + g._count.id, 0);
      const converted = quotationStats
        .filter(g => ['CONFIRMED', 'CONVERTED'].includes(g.status))
        .reduce((s, g) => s + g._count.id, 0);
      quotationConversionRate = total90 > 0 ? Math.round((converted / total90) * 100) : 0;
    }

    // Get value totals
    const allCustomersForValues = await prisma.customer.findMany({
      where: { ...customerWhere, deletedAt: null },
      select: {
        estimatedValue: true,
        weightedValue: true,
      },
    });

    const totalEstimatedValue = allCustomersForValues.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
    const totalWeightedValue = allCustomersForValues.reduce((sum, c) => sum + (c.weightedValue || 0), 0);

    // Get latest performance review per employee (admin only)
    const latestReviews = canViewAll
      ? await prisma.performanceReview.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            userId: true,
            overallRating: true,
            tasksCompleted: true,
            tasksOnTime: true,
            period: true,
            periodEnd: true,
          },
          orderBy: { periodEnd: 'desc' },
          distinct: ['userId'],
        })
      : [];

    const reviewMap = new Map(latestReviews.map((r) => [r.userId, r]));

    return NextResponse.json({
      data: {
        stats: {
          totalCustomers,
          myCustomers,
          openTasks,
          overdueTasks,
          completedThisWeek,
          totalEstimatedValue,
          totalWeightedValue,
          invoicedThisMonth: invoicedThisMonthTotal,
          outstandingAmount: outstandingTotal,
          quotationConversionRate,
          activeProducts: activeProductsCount ?? 0,
          totalClients: totalClientsCount ?? 0,
          pendingQuotations: pendingQuotationsCount ?? 0,
        },
        issues: {
          customersNoTasks,
          customersNotUpdated,
        },
        tasksToday,
        recentInternalTasks,
        pendingApprovals,
        employeeDistribution: employeeDistribution.map((emp) => {
          const review = reviewMap.get(emp.id);
          const onTimeRate = review && review.tasksCompleted > 0
            ? Math.round((review.tasksOnTime / review.tasksCompleted) * 100)
            : null;
          return {
            id: emp.id,
            fullName: emp.fullName,
            jobTitle: emp.jobTitle,
            customerCount: emp._count.ownedCustomers,
            openTasksCount: emp._count.assignedTasks,
            completedInternalTasks: emp._count.assignedInternalTasks,
            latestRating: review?.overallRating ?? null,
            onTimeRate,
            reviewPeriod: review?.period ?? null,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
