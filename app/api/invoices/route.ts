import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createInvoiceSchema } from '@/lib/validations/invoice';
import { z } from 'zod';

// GET /api/invoices - List invoices with filters and pagination
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
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const total = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createInvoiceSchema.parse(body);

    // Auto-generate invoice number
    const lastRecord = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastRecord?.invoiceNumber) {
      const parts = lastRecord.invoiceNumber.split('-');
      if (parts[1] === String(year)) seq = parseInt(parts[2]) + 1;
    }
    const invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`;

    // Calculate totals
    const itemsData = validatedData.items.map((item, index) => {
      const lineDiscount = item.discount || 0;
      const lineTotal = item.quantity * item.unitPrice * (1 - lineDiscount / 100);
      return {
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: lineDiscount,
        total: lineTotal,
        sortOrder: index,
      };
    });

    const subtotal = itemsData.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = validatedData.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const taxPercent = validatedData.taxPercent ?? 5;
    const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
    const total = subtotal - discountAmount + taxAmount;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: validatedData.customerId,
          quotationId: validatedData.quotationId || null,
          subject: validatedData.subject || null,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          subtotal,
          discountPercent,
          discountAmount,
          taxPercent,
          taxAmount,
          total,
          createdById: session.user.id,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          items: true,
        },
      });
      return invoice;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
