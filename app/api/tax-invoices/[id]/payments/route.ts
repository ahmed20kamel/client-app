import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
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

    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: { where: { status: 'CONFIRMED' } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Guard: cancelled invoices accept no further payments
    if (invoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot add payments to a cancelled invoice.' }, { status: 409 });
    }

    // Guard: prevent overpayment — new CONFIRMED payment must not push total past invoice amount
    if (data.status === 'CONFIRMED') {
      const alreadyPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      if (alreadyPaid + data.amount > invoice.total + 0.01) {
        return NextResponse.json(
          { error: `Payment of ${data.amount} would exceed invoice total. Remaining: ${(invoice.total - alreadyPaid).toFixed(2)}` },
          { status: 400 }
        );
      }
    }

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

      // Recalculate paidAmount from all confirmed payments (including new one)
      const allConfirmed = await tx.taxInvoicePayment.findMany({
        where: { invoiceId, status: 'CONFIRMED' },
      });
      const paidAmount = allConfirmed.reduce((sum, p) => sum + p.amount, 0);

      // Derive status — use 0.01 tolerance to handle floating-point precision
      let invoiceStatus: string;
      if (paidAmount <= 0) {
        invoiceStatus = 'UNPAID';
      } else if (paidAmount >= invoice.total - 0.01) {
        invoiceStatus = 'PAID';
      } else {
        invoiceStatus = 'PARTIAL';
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
    logError('Create invoice payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
