import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createDeliveryNoteSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// Helper: generate DN-1251/2026 format
async function generateDNNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastRecord = await prisma.deliveryNote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { dnNumber: true },
  });
  let seq = 1;
  if (lastRecord?.dnNumber) {
    // DN-1251/2026 → split by '-' then '/'
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
    console.error('Get delivery notes error:', error);
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

    const body = await request.json();
    const validatedData = createDeliveryNoteSchema.parse(body);

    const dnNumber = await generateDNNumber();

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

    const result = await prisma.deliveryNote.create({
      data: {
        dnNumber,
        quotationId: validatedData.quotationId || null,
        taxInvoiceId: validatedData.taxInvoiceId || null,
        customerId: validatedData.customerId,
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
        taxInvoice: { select: { id: true, invoiceNumber: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Update tax invoice DN number reference if linked
    if (validatedData.taxInvoiceId) {
      await prisma.taxInvoice.update({
        where: { id: validatedData.taxInvoiceId },
        data: { dnNumber },
      });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Create delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
