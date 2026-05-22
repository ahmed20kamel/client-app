import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const inv = await prisma.vendorInvoice.findUnique({
      where: { id },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            items: true,
            goodsReceipts: { include: { items: true } },
          },
        },
      },
    });
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const po = inv.purchaseOrder;
    const grns = po.goodsReceipts;
    const totalReceivedByDesc: Record<string, number> = {};
    for (const grn of grns) {
      for (const item of grn.items) {
        totalReceivedByDesc[item.description] = (totalReceivedByDesc[item.description] || 0) + item.receivedQty;
      }
    }

    let matched = true;
    const details = inv.items.map(invItem => {
      const poItem = po.items.find(p => p.description === invItem.description);
      const receivedQty = totalReceivedByDesc[invItem.description] || 0;
      const qtyMatch = poItem ? Math.abs(invItem.quantity - poItem.quantity) < 0.01 : false;
      const priceMatch = poItem ? Math.abs(invItem.unitPrice - poItem.unitPrice) < 0.01 : false;
      const receivedMatch = receivedQty >= invItem.quantity;
      if (!qtyMatch || !priceMatch || !receivedMatch) matched = false;
      return {
        description: invItem.description,
        invoiceQty: invItem.quantity,
        poQty: poItem?.quantity,
        receivedQty,
        invoicePrice: invItem.unitPrice,
        poPrice: poItem?.unitPrice,
        qtyMatch,
        priceMatch,
        receivedMatch,
      };
    });

    if (matched) {
      await prisma.vendorInvoice.update({ where: { id }, data: { status: 'MATCHED', matchedAt: new Date() } });
    }

    return NextResponse.json({ data: { matched, details } });
  } catch (error) {
    logError('3-way match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
