import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const sq = await prisma.supplierQuotation.findUnique({
      where: { id },
      include: { items: true, purchaseRequest: true },
    });
    if (!sq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (sq.status === 'ACCEPTED') return NextResponse.json({ error: 'Already accepted' }, { status: 400 });

    const count = await prisma.purchaseOrder.count();
    const year = new Date().getFullYear().toString().slice(-2);
    const poNumber = `PO-${year}-${String(count + 1).padStart(3, '0')}`;

    const [, , po] = await prisma.$transaction([
      prisma.supplierQuotation.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      prisma.supplierQuotation.updateMany({
        where: { purchaseRequestId: sq.purchaseRequestId, id: { not: id } },
        data: { status: 'REJECTED', rejectedAt: new Date() },
      }),
      prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: sq.supplierId,
          purchaseRequestId: sq.purchaseRequestId,
          supplierQuotationId: sq.id,
          subject: sq.purchaseRequest?.title || null,
          notes: sq.notes || null,
          subtotal: sq.subtotal,
          taxPercent: sq.taxPercent,
          taxAmount: sq.taxAmount,
          total: sq.total,
          status: 'DRAFT',
          createdById: session.user.id,
          items: {
            create: sq.items.map((item, i) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              sortOrder: i,
            })),
          },
        },
        include: { items: true },
      }),
    ]);

    return NextResponse.json({ data: po });
  } catch (error) {
    logError('Accept quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
