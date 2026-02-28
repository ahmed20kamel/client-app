import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { assignOwnerSchema } from '@/lib/validations/customer';
import { z } from 'zod';

// POST /api/customers/[id]/assign-owner - Assign owner to customer (Admin only)
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
    const hasPermission = await can(session.user.id, 'customer.assign-owner');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { ownerId } = assignOwnerSchema.parse(body);

    // Check if new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!newOwner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    // Update customer owner
    const customer = await prisma.customer.update({
      where: { id },
      data: { ownerId },
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
    await logAudit({
      actorUserId: session.user.id,
      action: 'customer.owner-assigned',
      entityType: 'Customer',
      entityId: id,
      before: {
        owner: existingCustomer.owner.fullName,
      },
      after: {
        owner: customer.owner.fullName,
      },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Assign owner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
