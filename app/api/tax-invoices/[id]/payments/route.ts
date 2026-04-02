import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['Cash', 'Cheque', 'Bank Transfer']),
  paymentDate: z.string().optional(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'CONFIRMED']).default('CONFIRMED'),
});

// GET /api/tax-invoices/[id]/payments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const payments = await prisma.taxInvoicePayment.findMany({
      where: { invoiceId: id },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tax-invoices/[id]/payments
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: invoiceId } = await params;

    const body = await request.json();
    const data = createPaymentSchema.parse(body);

    // Get invoice to validate
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { where: { status: 'CONFIRMED' } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.taxInvoicePayment.create({
        data: {
          invoiceId,
          amount: data.amount,
          method: data.method,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          reference: data.reference || null,
          notes: data.notes || null,
          status: data.status,
          createdById: session.user.id,
        },
      });

      // Recalculate paidAmount and status
      const allConfirmed = await tx.taxInvoicePayment.findMany({
        where: { invoiceId, status: 'CONFIRMED' },
      });
      const paidAmount = allConfirmed.reduce((sum, p) => sum + p.amount, 0);

      let invoiceStatus = invoice.status;
      if (paidAmount <= 0) {
        invoiceStatus = 'UNPAID';
      } else if (paidAmount >= invoice.total) {
        invoiceStatus = 'PAID';
      } else {
        invoiceStatus = 'PARTIAL';
      }
      // Don't override CANCELLED or DRAFT
      if (invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') {
        invoiceStatus = invoice.status;
      }

      await tx.taxInvoice.update({
        where: { id: invoiceId },
        data: { paidAmount, status: invoiceStatus },
      });

      return payment;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
