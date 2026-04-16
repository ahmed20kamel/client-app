import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { receiveItemsSchema } from '@/lib/validations/purchase-order';
import { z } from 'zod';

// POST /api/purchase-orders/[id]/receive - Receive items for purchase order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = receiveItemsSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      // Update each item's receivedQty and handle stock
      for (const receiveItem of validatedData.items) {
        const poItem = purchaseOrder.items.find(i => i.id === receiveItem.itemId);
        if (!poItem) continue;

        const newReceivedQty = poItem.receivedQty + receiveItem.receivedQty;

        // Update the PO item's receivedQty
        await tx.purchaseOrderItem.update({
          where: { id: receiveItem.itemId },
          data: { receivedQty: newReceivedQty },
        });

        // If item has a productId, create stock movement and update product stock
        if (poItem.productId && receiveItem.receivedQty > 0) {
          const product = await tx.product.findUnique({
            where: { id: poItem.productId },
          });

          if (product) {
            const previousStock = product.currentStock;
            const newStock = previousStock + receiveItem.receivedQty;

            await tx.stockMovement.create({
              data: {
                productId: poItem.productId,
                type: 'IN',
                quantity: receiveItem.receivedQty,
                previousStock,
                newStock,
                reason: 'Purchase Order Receipt',
                reference: purchaseOrder.poNumber,
                createdById: session.user.id,
              },
            });

            await tx.product.update({
              where: { id: poItem.productId },
              data: { currentStock: newStock },
            });
          }
        }
      }

      // Re-fetch items to check if all are fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allFullyReceived = updatedItems.every(item => item.receivedQty >= item.quantity);
      const someReceived = updatedItems.some(item => item.receivedQty > 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusUpdate: any = {};

      if (allFullyReceived) {
        statusUpdate.status = 'RECEIVED';
        statusUpdate.receivedAt = new Date();
      } else if (someReceived) {
        statusUpdate.status = 'PARTIALLY_RECEIVED';
      }

      if (Object.keys(statusUpdate).length > 0) {
        await tx.purchaseOrder.update({
          where: { id },
          data: statusUpdate,
        });
      }

      return tx.purchaseOrder.findUnique({
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
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    logError('Receive purchase order items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
