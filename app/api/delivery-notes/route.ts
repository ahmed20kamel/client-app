import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { createDeliveryNoteSchema } from '@/lib/validations/quotation';
import { withUniqueRetry } from '@/lib/db-utils';
import { z } from 'zod';

// Helper: generate DN-1251/2026 format (atomic inside transaction)
async function generateDNNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const year = new Date().getFullYear();
  const lastRecord = await tx.deliveryNote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { dnNumber: true },
  });
  let seq = 1;
  if (lastRecord?.dnNumber) {
    const parts = lastRecord.dnNumber.split('-');
    if (parts.length >= 2) {
      const seqPart = parts[1]?.split('/')[0];
      const lastSeq = parseInt(seqPart || '0');
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
  }
  return `DN-${seq}/${year}`;
}

// GET /api/delivery-notes
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = await can(session.user.id, 'reports.view.all');
    const canViewOwn = await can(session.user.id, 'reports.view.own');
    if (!canView && !canViewOwn) {
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
    if (search) {
      where.OR = [
        { dnNumber: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { receiverName: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const total = await prisma.deliveryNote.count({ where });
    const notes = await prisma.deliveryNote.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true } },
        client: { select: { id: true, companyName: true } },
        taxInvoice: { select: { id: true, invoiceNumber: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: notes,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logError('Get delivery notes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/delivery-notes
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
    const validatedData = createDeliveryNoteSchema.parse(body);

    if (!validatedData.customerId && !validatedData.clientId) {
      return NextResponse.json({ error: 'Customer or client is required' }, { status: 400 });
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

    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const dnNumber = await generateDNNumber(tx);
      const deliveryNote = await tx.deliveryNote.create({
        data: {
          dnNumber,
          quotationId: validatedData.quotationId || null,
          taxInvoiceId: validatedData.taxInvoiceId || null,
          customerId: validatedData.customerId || null,
          clientId: validatedData.clientId || null,
          engineerName: validatedData.engineerName || null,
          mobileNumber: validatedData.mobileNumber || null,
          projectName: validatedData.projectName || null,
          salesmanSign: validatedData.salesmanSign || null,
          receiverName: validatedData.receiverName || null,
          receiverSign: validatedData.receiverSign || null,
          notes: validatedData.notes || null,
          createdById: session.user.id,
          items: { create: itemsData },
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          client: { select: { id: true, companyName: true } },
          taxInvoice: { select: { id: true, invoiceNumber: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // Update tax invoice DN number reference inside the transaction
      if (validatedData.taxInvoiceId) {
        await tx.taxInvoice.update({
          where: { id: validatedData.taxInvoiceId },
          data: { dnNumber: deliveryNote.dnNumber },
        });
      }

      return deliveryNote;
    }));

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    logError('Create delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
