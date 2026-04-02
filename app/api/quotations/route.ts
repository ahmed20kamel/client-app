import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createQuotationSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// Helper: generate serial SC-LBS-XXX-YY
async function generateQuotationNumber(productCode: string = 'LBS'): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `SC-${productCode}`;
  const lastRecord = await prisma.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { quotationNumber: true },
  });
  let seq = 1;
  if (lastRecord?.quotationNumber) {
    const parts = lastRecord.quotationNumber.split('-');
    // SC-LBS-257-26 → parts[2] = '257'
    const lastSeq = parseInt(parts[2]);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}-${seq}-${year}`;
}

// GET /api/quotations
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
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { engineerName: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const total = await prisma.quotation.count({ where });
    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        client: { select: { id: true, companyName: true } },
        engineer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: quotations,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quotations
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createQuotationSchema.parse(body);

    // Determine product code from first item's product
    let productCode = 'LBS';
    if (validatedData.items[0]?.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.items[0].productId },
        select: { productCode: true },
      });
      if (product?.productCode) productCode = product.productCode;
    }

    const quotationNumber = await generateQuotationNumber(productCode);

    const itemsData = validatedData.items.map((item, index) => {
      const lineDiscount = item.discount || 0;
      const lm = item.linearMeters ?? (item.quantity * (item.length ?? 1));
      const lineTotal = lm * item.unitPrice * (1 - lineDiscount / 100);
      return {
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        length: item.length ?? null,
        linearMeters: item.unit === 'LM' ? lm : null,
        size: item.size ?? null,
        unit: item.unit ?? null,
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
    const deliveryCharges = validatedData.deliveryCharges ?? 0;
    const total = subtotal - discountAmount + taxAmount + deliveryCharges;

    // validUntil default: 30 days from now
    const validUntilDate = validatedData.validUntil
      ? new Date(validatedData.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Resolve customerId: use provided or fallback to a system placeholder
    // If clientId provided but no customerId, find/create a linked customer or use first available
    let resolvedCustomerId = validatedData.customerId || null;
    if (!resolvedCustomerId && validatedData.clientId) {
      // Use the admin/system user's first customer or just create the quotation without customer
      // For now, we store clientId and set customerId to null-safe fallback
      const firstCustomer = await prisma.customer.findFirst({ select: { id: true } });
      resolvedCustomerId = firstCustomer?.id || null;
    }
    if (!resolvedCustomerId) {
      return NextResponse.json({ error: 'Customer or Client is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: resolvedCustomerId!,
          clientId: validatedData.clientId || null,
          engineerId: validatedData.engineerId || null,
          engineerName: validatedData.engineerName || null,
          mobileNumber: validatedData.mobileNumber || null,
          projectName: validatedData.projectName || null,
          subject: validatedData.subject || null,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          validUntil: validUntilDate,
          subtotal,
          discountPercent,
          discountAmount,
          taxPercent,
          taxAmount,
          deliveryCharges,
          total,
          createdById: session.user.id,
          items: { create: itemsData },
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          client: { select: { id: true, companyName: true } },
          engineer: { select: { id: true, name: true, mobile: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return quotation;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Create quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
