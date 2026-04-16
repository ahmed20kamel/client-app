import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { updatePurchaseOrderSchema } from '@/lib/validations/purchase-order';
import { z } from 'zod';

// GET /api/purchase-orders/[id] - Get single purchase order
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
    const canView = await can(session.user.id, 'reports.view.all');
    const canViewOwn = await can(session.user.id, 'reports.view.own');
    if (!canView && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchaseOrder });
  } catch (error) {
    logError('Get purchase order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/purchase-orders/[id] - Update purchase order
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
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingPO = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const body = await request.json();

    // Status transition validation
    if (body.status) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        DRAFT:              ['SENT', 'CANCELLED'],
        SENT:               ['CONFIRMED', 'CANCELLED'],
        CONFIRMED:          ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
        PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
        RECEIVED:           [],
        CANCELLED:          [],
      };
      const allowed = VALID_TRANSITIONS[existingPO.status] ?? [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existingPO.status} to ${body.status}` },
          { status: 400 }
        );
      }
      // Set timestamps
      const now = new Date();
      if (body.status === 'SENT') body.sentAt = now;
      if (body.status === 'CONFIRMED') body.confirmedAt = now;
      if (body.status === 'RECEIVED') body.receivedAt = now;
    }

    // Guard: cannot edit items on a RECEIVED/CANCELLED PO
    if (['RECEIVED', 'CANCELLED'].includes(existingPO.status) && body.items) {
      return NextResponse.json({ error: 'Cannot edit items on a completed or cancelled PO.' }, { status: 409 });
    }

    const validatedData = updatePurchaseOrderSchema.parse(body);

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (validatedData.supplierId !== undefined) updateData.supplierId = validatedData.supplierId;
    if (validatedData.subject !== undefined) updateData.subject = validatedData.subject ?? null;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes ?? null;
    if (validatedData.terms !== undefined) updateData.terms = validatedData.terms ?? null;
    if (validatedData.expectedDate !== undefined) {
      updateData.expectedDate = validatedData.expectedDate ? new Date(validatedData.expectedDate) : null;
    }

    // If items are provided, recalculate totals and recreate items
    if (validatedData.items) {
      const items = validatedData.items.map((item, index) => ({
        productId: item.productId ?? null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        sortOrder: index,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discountPercent = validatedData.discountPercent ?? existingPO.discountPercent;
      const discountAmount = subtotal * discountPercent / 100;
      const taxPercent = validatedData.taxPercent ?? existingPO.taxPercent;
      const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
      const total = subtotal - discountAmount + taxAmount;

      updateData.subtotal = subtotal;
      updateData.discountPercent = discountPercent;
      updateData.discountAmount = discountAmount;
      updateData.taxPercent = taxPercent;
      updateData.taxAmount = taxAmount;
      updateData.total = total;

      // Delete old items and create new ones in a transaction
      const purchaseOrder = await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: items,
            },
          },
          include: {
            supplier: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        });
      });

      return NextResponse.json({ data: purchaseOrder });
    } else {
      // Update without items - recalculate if discount/tax changed
      if (validatedData.discountPercent !== undefined || validatedData.taxPercent !== undefined) {
        const discountPercent = validatedData.discountPercent ?? existingPO.discountPercent;
        const taxPercent = validatedData.taxPercent ?? existingPO.taxPercent;
        const discountAmount = existingPO.subtotal * discountPercent / 100;
        const taxAmount = (existingPO.subtotal - discountAmount) * taxPercent / 100;
        const total = existingPO.subtotal - discountAmount + taxAmount;

        updateData.discountPercent = discountPercent;
        updateData.discountAmount = discountAmount;
        updateData.taxPercent = taxPercent;
        updateData.taxAmount = taxAmount;
        updateData.total = total;
      }

      const purchaseOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return NextResponse.json({ data: purchaseOrder });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    logError('Update purchase order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-orders/[id] - Delete purchase order
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
    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (['RECEIVED', 'PARTIALLY_RECEIVED'].includes(purchaseOrder.status)) {
      return NextResponse.json({ error: 'Cannot delete a PO that has already received stock.' }, { status: 409 });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    logError('Delete purchase order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
