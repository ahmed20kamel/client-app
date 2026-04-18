import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/tax-invoices/[id]/payments/[paymentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: invoiceId, paymentId } = await params;

    await prisma.$transaction(async (tx) => {
      await tx.taxInvoicePayment.delete({ where: { id: paymentId } });

      // Recalculate paidAmount and status
      const invoice = await tx.taxInvoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return;

      const confirmed = await tx.taxInvoicePayment.findMany({
        where: { invoiceId, status: 'CONFIRMED' },
      });
      const paidAmount = confirmed.reduce((sum, p) => sum + p.amount, 0);

      // Always derive status from payment totals (DRAFT gets promoted automatically)
      let status = invoice.status;
      if (invoice.status !== 'CANCELLED') {
        if (paidAmount <= 0) status = 'UNPAID';
        else if (paidAmount >= invoice.total) status = 'PAID';
        else status = 'PARTIAL';
      }

      await tx.taxInvoice.update({ where: { id: invoiceId }, data: { paidAmount, status } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
