import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/reports/customers-no-followup - Customers with no follow-up tasks
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId') || '';
    const customerType = searchParams.get('customerType') || '';

    // Check permissions
    const canViewAll = await can(session.user.id, 'customer.view.all');

    // Build where clause
    const where: any = {
      deletedAt: null,
      tasks: {
        none: {
          status: { in: ['OPEN', 'OVERDUE'] },
        },
      },
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

    // Get customers with no open tasks
    const customers = await prisma.customer.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ data: customers });
  } catch (error) {
    console.error('Customers no followup report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
