import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await prisma.supplierQuotation.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseRequest: { select: { id: true, prNumber: true, title: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    logError('Get supplier quotations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const count = await prisma.supplierQuotation.count();
    const year = new Date().getFullYear().toString().slice(-2);
    const sqNumber = `SQ-${year}-${String(count + 1).padStart(3, '0')}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = body.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.unitPrice || 0) * parseFloat(i.quantity || 1)), 0);
    const taxPercent = body.taxPercent ?? 5;
    const taxAmount = subtotal * taxPercent / 100;
    const total = subtotal + taxAmount;
    const sq = await prisma.supplierQuotation.create({
      data: {
        sqNumber,
        purchaseRequestId: body.purchaseRequestId,
        supplierId: body.supplierId,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        notes: body.notes || null,
        paymentTerms: body.paymentTerms || null,
        deliveryDays: body.deliveryDays ? parseInt(body.deliveryDays) : null,
        subtotal,
        taxPercent,
        taxAmount,
        total,
        items: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: items.map((item: any, i: number) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || null,
            unitPrice: parseFloat(item.unitPrice) || 0,
            total: (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1),
            purchaseRequestItemId: item.purchaseRequestItemId || null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });
    return NextResponse.json({ data: sq }, { status: 201 });
  } catch (error) {
    logError('Create supplier quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
