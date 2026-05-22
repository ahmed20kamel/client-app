import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await prisma.vendorInvoice.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    logError('Get vendor invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const count = await prisma.vendorInvoice.count();
    const year = new Date().getFullYear().toString().slice(-2);
    const ourRef = `VIN-${year}-${String(count + 1).padStart(3, '0')}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = body.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.unitPrice || 0) * parseFloat(i.quantity || 1)), 0);
    const taxPercent = body.taxPercent ?? 5;
    const taxAmount = subtotal * taxPercent / 100;
    const total = subtotal + taxAmount;
    const inv = await prisma.vendorInvoice.create({
      data: {
        ourRef,
        vendorInvoiceNo: body.vendorInvoiceNo || null,
        purchaseOrderId: body.purchaseOrderId,
        supplierId: body.supplierId,
        invoiceDate: new Date(body.invoiceDate),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal,
        taxPercent,
        taxAmount,
        total,
        notes: body.notes || null,
        createdById: session.user.id,
        items: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: items.map((item: any, i: number) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || null,
            unitPrice: parseFloat(item.unitPrice) || 0,
            total: (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1),
            purchaseOrderItemId: item.purchaseOrderItemId || null,
            sortOrder: i,
          })),
        },
      },
      include: { items: true },
    });
    return NextResponse.json({ data: inv }, { status: 201 });
  } catch (error) {
    logError('Create vendor invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
