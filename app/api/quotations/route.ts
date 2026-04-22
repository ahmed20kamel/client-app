import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createQuotationSchema } from '@/lib/validations/quotation';
import { withUniqueRetry } from '@/lib/db-utils';
import { z } from 'zod';

// Helper: generate quotation number SC-LBS-{N}-{YY}
async function generateQuotationNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const yy = new Date().getFullYear().toString().slice(-2);
  const all = await tx.quotation.findMany({ select: { quotationNumber: true } });
  let max = 132;
  for (const q of all) {
    const m = q.quotationNumber.match(/^SC-[A-Z]+-(\d+)-\d+$/);
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  }
  return `SC-LBS-${max + 1}-${yy}`;
}

// GET /api/quotations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canViewAll = await can(session.user.id, 'quotation.view.all');
    const canViewOwn = await can(session.user.id, 'quotation.view.own');
    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Scope: non-admin employees only see their own quotations
    if (!canViewAll) {
      where.createdById = session.user.id;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { projectName:     { contains: search, mode: 'insensitive' } },
        { engineerName:    { contains: search, mode: 'insensitive' } },
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

    if (!(await can(session.user.id, 'quotation.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      const quotationNumber = await generateQuotationNumber(tx);
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
