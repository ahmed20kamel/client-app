import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/purchase-orders/[id]/send - Mark purchase order as sent
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
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT purchase orders can be sent' },
        { status: 400 }
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      include: {
        supplier: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Send purchase order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
