import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createQuotationSchema } from '@/lib/validations/quotation';
import { withUniqueRetry } from '@/lib/db-utils';
import { z } from 'zod';

// Helper: generate serial SC-{PROJECT}-{seq}-{YY}
async function generateQuotationNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], projectName?: string | null): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  // Clean project name: uppercase, remove spaces/special chars, max 10 chars
  const code = projectName
    ? projectName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    : 'LBS';
  const prefix = `SC-${code}`;
  const lastRecord = await tx.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { quotationNumber: true },
  });
  let seq = 1;
  if (lastRecord?.quotationNumber) {
    const parts = lastRecord.quotationNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 2]);
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

    // Any authenticated user can view quotations

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },

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
    logError('Get quotations error:', error);
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

    // Any authenticated user can create quotations

    const body = await request.json();
    const validatedData = createQuotationSchema.parse(body);

    // Use project name for quotation number serial

    const itemsData = validatedData.items.map((item, index) => {
      const lineDiscount = item.discount || 0;
      const lm = item.linearMeters ?? (item.quantity * (item.length ?? 100) / 100);
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
    const deliveryCharges = validatedData.deliveryCharges ?? 0;
    const taxAmount = (subtotal - discountAmount + deliveryCharges) * taxPercent / 100;
    const total = subtotal - discountAmount + deliveryCharges + taxAmount;

    // validUntil default: 30 days from now
    const validUntilDate = validatedData.validUntil
      ? new Date(validatedData.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const resolvedCustomerId = validatedData.customerId || null;
    const resolvedClientId = validatedData.clientId || null;
    if (!resolvedCustomerId && !resolvedClientId) {
      return NextResponse.json({ error: 'Customer or Client is required' }, { status: 400 });
    }

    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const quotationNumber = await generateQuotationNumber(tx, validatedData.projectName);
      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: resolvedCustomerId,
          clientId: resolvedClientId,
          engineerId: validatedData.engineerId || null,
          engineerName: validatedData.engineerName || null,
          mobileNumber: validatedData.mobileNumber || null,
          projectName: validatedData.projectName || null,

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
    }));

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    logError('Create quotation error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
