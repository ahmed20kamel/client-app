import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const payment = await prisma.procurementPayment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const inv = await tx.vendorInvoice.findUnique({ where: { id: payment.vendorInvoiceId } });
      if (inv) {
        const newPaid = Math.max(0, inv.paidAmount - payment.amount);
        await tx.vendorInvoice.update({
          where: { id: payment.vendorInvoiceId },
          data: {
            paidAmount: newPaid,
            status: newPaid >= inv.total ? 'PAID' : 'APPROVED',
          },
        });
      }
      await tx.procurementPayment.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
