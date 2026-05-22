import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await prisma.procurementPayment.findMany({
      include: {
        vendorInvoice: { select: { id: true, ourRef: true, total: true } },
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    logError('Get payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.procurementPayment.create({
        data: {
          vendorInvoiceId: body.vendorInvoiceId,
          supplierId: body.supplierId,
          amount: parseFloat(body.amount),
          method: body.method || 'Bank Transfer',
          paymentDate: new Date(body.paymentDate),
          reference: body.reference || null,
          notes: body.notes || null,
          status: 'PAID',
          createdById: session.user.id,
        },
      });
      const inv = await tx.vendorInvoice.findUnique({ where: { id: body.vendorInvoiceId } });
      if (inv) {
        const newPaid = inv.paidAmount + parseFloat(body.amount);
        await tx.vendorInvoice.update({
          where: { id: body.vendorInvoiceId },
          data: {
            paidAmount: newPaid,
            status: newPaid >= inv.total ? 'PAID' : 'APPROVED',
          },
        });
      }
      return p;
    });
    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    logError('Create payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
