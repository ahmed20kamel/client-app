import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createTaxInvoiceSchema } from '@/lib/validations/quotation';
import { withUniqueRetry } from '@/lib/db-utils';
import { z } from 'zod';

// Helper: generate SC-671/26 format (atomic inside transaction)
async function generateTaxInvoiceNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const lastRecord = await tx.taxInvoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  let seq = 1;
  if (lastRecord?.invoiceNumber) {
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

    // Any authenticated user can view tax invoices

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
        client: { select: { id: true, companyName: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
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
    logError('Get tax invoices error:', error);
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

    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    // Enforce Finance Confirmation step — APPROVED alone is not enough
    if (quotation.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Tax invoice can only be created after Finance Confirmation (status must be CONFIRMED).' },
        { status: 400 }
      );
    }


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

    // Re-fetch quotation with payment info for deposit logic
    const quotationFull = await prisma.quotation.findUnique({
      where: { id: validatedData.quotationId },
      select: {
        depositAmount: true,
        depositPercent: true,
        paymentType: true,
        paymentNotes: true,
      },
    });

    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateTaxInvoiceNumber(tx);
      const invoice = await tx.taxInvoice.create({
        data: {
          invoiceNumber,
          quotationId: validatedData.quotationId,
          customerId: validatedData.customerId || quotation.customerId || null,
          clientId: quotation.clientId || null,
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

      // Auto-create deposit payment if finance confirmed a deposit/advance
      const depositAmt = quotationFull?.depositAmount ?? 0;
      const paymentType = quotationFull?.paymentType;
      const shouldAutoDeposit =
        depositAmt > 0 &&
        (paymentType === 'DEPOSIT' || paymentType === 'FULL_ADVANCE');

      if (shouldAutoDeposit) {
        await tx.taxInvoicePayment.create({
          data: {
            invoiceId: invoice.id,
            amount: depositAmt,
            method: quotation.paymentTerms || 'Bank Transfer',
            paymentDate: new Date(),
            reference: `Auto: ${paymentType === 'FULL_ADVANCE' ? 'Full Advance' : `Deposit ${quotationFull?.depositPercent ?? ''}%`}`,
            notes: quotationFull?.paymentNotes || null,
            status: 'CONFIRMED',
            createdById: session.user.id,
          },
        });
        // Update paidAmount on invoice
        await tx.taxInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: depositAmt },
        });
      }

      // Mark quotation as CONVERTED (only if not already)
      if (quotation.status !== 'CONVERTED') {
        await tx.quotation.update({
          where: { id: validatedData.quotationId },
          data: { status: 'CONVERTED' },
        });
      }

      return invoice;
    }));

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    logError('Create tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
