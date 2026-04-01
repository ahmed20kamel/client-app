import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createTaxInvoiceSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// Helper: generate SC-671/26 format
async function generateTaxInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const lastRecord = await prisma.taxInvoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  let seq = 1;
  if (lastRecord?.invoiceNumber) {
    // SC-671/26 → split by '-' then '/'
    const parts = lastRecord.invoiceNumber.split('-');
    if (parts.length >= 2) {
      const seqPart = parts[1]?.split('/')[0];
      const lastSeq = parseInt(seqPart || '0');
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
  }
  return `SC-${seq}/${year}`;
}

// GET /api/tax-invoices
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
        { projectName: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const total = await prisma.taxInvoice.count({ where });
    const invoices = await prisma.taxInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get tax invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tax-invoices — auto-generate from approved quotation or manual
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTaxInvoiceSchema.parse(body);

    // Verify quotation exists and is approved
    const quotation = await prisma.quotation.findUnique({
      where: { id: validatedData.quotationId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    if (quotation.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Tax invoice can only be created from an approved quotation' },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateTaxInvoiceNumber();

    const itemsData = validatedData.items.map((item, index) => ({
      productId: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      length: item.length ?? null,
      linearMeters: item.linearMeters ?? null,
      size: item.size ?? null,
      unit: item.unit ?? null,
      unitPrice: item.unitPrice,
      total: item.total,
      sortOrder: item.sortOrder ?? index,
    }));

    const subtotal = itemsData.reduce((sum, item) => sum + item.total, 0);
    const taxPercent = validatedData.taxPercent ?? 5;
    const taxAmount = subtotal * taxPercent / 100;
    const deliveryCharges = validatedData.deliveryCharges ?? 0;
    const total = subtotal + taxAmount + deliveryCharges;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.taxInvoice.create({
        data: {
          invoiceNumber,
          quotationId: validatedData.quotationId,
          customerId: validatedData.customerId,
          customerTrn: validatedData.customerTrn || null,
          ourVatReg: validatedData.ourVatReg || null,
          dnNumber: validatedData.dnNumber || null,
          engineerName: validatedData.engineerName || quotation.engineerName || null,
          mobileNumber: validatedData.mobileNumber || quotation.mobileNumber || null,
          projectName: validatedData.projectName || quotation.projectName || null,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          subtotal,
          taxPercent,
          taxAmount,
          deliveryCharges,
          total,
          lpoNumber: validatedData.lpoNumber || quotation.lpoNumber || null,
          paymentTerms: validatedData.paymentTerms || quotation.paymentTerms || null,
          createdById: session.user.id,
          items: { create: itemsData },
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // Mark quotation as CONVERTED
      await tx.quotation.update({
        where: { id: validatedData.quotationId },
        data: { status: 'CONVERTED' },
      });

      return invoice;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Create tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
