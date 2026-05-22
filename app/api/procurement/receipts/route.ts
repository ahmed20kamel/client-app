import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await prisma.goodsReceipt.findMany({
      include: {
        purchaseOrder: { select: { id: true, poNumber: true, supplier: { select: { name: true } } } },
        receivedBy: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    logError('Get GRNs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const count = await prisma.goodsReceipt.count();
    const year = new Date().getFullYear().toString().slice(-2);
    const grnNumber = `GRN-${year}-${String(count + 1).padStart(3, '0')}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = body.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allReceived = items.every((i: any) => parseFloat(i.receivedQty) >= parseFloat(i.orderedQty));
    const status = allReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';
    const grn = await prisma.goodsReceipt.create({
      data: {
        grnNumber,
        purchaseOrderId: body.purchaseOrderId,
        notes: body.notes || null,
        status,
        receivedAt: new Date(),
        receivedById: session.user.id,
        items: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: items.map((item: any, i: number) => ({
            description: item.description,
            orderedQty: parseFloat(item.orderedQty) || 0,
            receivedQty: parseFloat(item.receivedQty) || 0,
            unit: item.unit || null,
            purchaseOrderItemId: item.purchaseOrderItemId || null,
            notes: item.notes || null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });
    if (status === 'FULLY_RECEIVED') {
      await prisma.purchaseOrder.update({ where: { id: body.purchaseOrderId }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    } else {
      await prisma.purchaseOrder.update({ where: { id: body.purchaseOrderId }, data: { status: 'PARTIALLY_RECEIVED' } });
    }
    return NextResponse.json({ data: grn }, { status: 201 });
  } catch (error) {
    logError('Create GRN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
