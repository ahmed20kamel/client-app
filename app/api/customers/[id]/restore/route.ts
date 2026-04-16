import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

// POST /api/customers/[id]/restore - Restore soft deleted customer (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await can(session.user.id, 'customer.delete.all');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if customer exists and is deleted
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.deletedAt) {
      return NextResponse.json(
        { error: 'Customer is not deleted' },
        { status: 400 }
      );
    }

    // Restore customer
    const restoredCustomer = await prisma.customer.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Log audit
    logAudit({
      actorUserId: session.user.id,
      action: 'customer.restored',
      entityType: 'Customer',
      entityId: id,
      before: {
        fullName: customer.fullName,
        deletedAt: customer.deletedAt,
      },
      after: {
        fullName: restoredCustomer.fullName,
        deletedAt: null,
      },
    }).catch((err) => console.error("Audit log error:", err));

    return NextResponse.json({ data: restoredCustomer });
  } catch (error) {
    console.error('Restore customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
