import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { updateDeliveryNoteSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// GET /api/delivery-notes/[id]
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
    // Any authenticated user can view delivery notes
    const note = await prisma.deliveryNote.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        client: { select: { id: true, companyName: true } },
        taxInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            lpoNumber: true,
            paymentTerms: true,
          },
        },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    logError('Get delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/delivery-notes/[id]
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

    const existing = await prisma.deliveryNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    // Guard: cannot change status of a RETURNED note
    const body = await request.json();
    if (body.status && existing.status === 'RETURNED') {
      return NextResponse.json({ error: 'Cannot change status of a returned delivery note.' }, { status: 409 });
    }

    const validatedData = updateDeliveryNoteSchema.parse(body);

    const isMarkingDelivered = validatedData.status === 'DELIVERED' && existing.status !== 'DELIVERED';

    // Fetch items with product if we need to deduct stock
    const noteItems = isMarkingDelivered
      ? await prisma.deliveryNoteItem.findMany({
          where: { deliveryNoteId: id },
          select: { productId: true, quantity: true },
        })
      : [];

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.deliveryNote.update({
        where: { id },
        data: {
          salesmanSign: validatedData.salesmanSign,
          receiverName: validatedData.receiverName,
          receiverSign: validatedData.receiverSign,
          notes: validatedData.notes,
          status: validatedData.status,
          deliveredAt:
            validatedData.status === 'DELIVERED' && !existing.deliveredAt
              ? new Date()
              : validatedData.deliveredAt
              ? new Date(validatedData.deliveredAt)
              : undefined,
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          client: { select: { id: true, companyName: true } },
          taxInvoice: { select: { id: true, invoiceNumber: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // Auto-deduct inventory stock for products in the delivery note
      if (isMarkingDelivered) {
        for (const item of noteItems) {
          if (!item.productId) continue;
          const qty = Math.round(item.quantity); // stock is integer
          if (qty <= 0) continue;

          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });
          const previousStock = product?.currentStock ?? 0;
          const newStock = Math.max(0, previousStock - qty);

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: qty,
              previousStock,
              newStock,
              reason: 'Delivery Note',
              reference: existing.dnNumber || id,
              createdById: session.user.id,
            },
          });
        }
      }

      return result;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    logError('Update delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/delivery-notes/[id]
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
    const canDelete = await can(session.user.id, 'reports.view.all');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    const note = await prisma.deliveryNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    if (note.status === 'DELIVERED') {
      return NextResponse.json({ error: 'Cannot delete a delivered delivery note.' }, { status: 409 });
    }

    await prisma.deliveryNote.delete({ where: { id } });
    return NextResponse.json({ message: 'Delivery note deleted successfully' });
  } catch (error) {
    logError('Delete delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
