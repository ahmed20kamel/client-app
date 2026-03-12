import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentSchema } from '@/lib/validations/payment';
import { z } from 'zod';

// GET /api/payments - List payments with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const method = searchParams.get('method') || '';
    const invoiceId = searchParams.get('invoiceId') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (method) {
      where.method = method;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    const total = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Get the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: validatedData.invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check that amount doesn't exceed remaining balance
    const remainingBalance = invoice.total - invoice.paidAmount;
    if (validatedData.amount > remainingBalance) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance of ${remainingBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Generate payment number
    const lastRecord = await prisma.payment.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true },
    });
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastRecord?.paymentNumber) {
      const parts = lastRecord.paymentNumber.split('-');
      if (parts[1] === String(year)) seq = parseInt(parts[2]) + 1;
    }
    const paymentNumber = `PAY-${year}-${String(seq).padStart(4, '0')}`;

    // Calculate new paid amount and status
    const newPaidAmount = invoice.paidAmount + validatedData.amount;
    const newStatus = newPaidAmount >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

    // Create payment and update invoice in a transaction
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: validatedData.invoiceId,
          amount: validatedData.amount,
          method: validatedData.method,
          reference: validatedData.reference ?? null,
          notes: validatedData.notes ?? null,
          paidAt: validatedData.paidAt ? new Date(validatedData.paidAt) : new Date(),
          createdById: session.user.id,
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await tx.invoice.update({
        where: { id: validatedData.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return created;
    });

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
