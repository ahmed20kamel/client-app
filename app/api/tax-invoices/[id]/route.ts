import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateTaxInvoiceSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// GET /api/tax-invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            lpoNumber: true,
            paymentTerms: true,
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        deliveryNotes: {
          select: { id: true, dnNumber: true, status: true, createdAt: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Tax invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error('Get tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tax-invoices/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tax invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateTaxInvoiceSchema.parse(body);

    const updated = await prisma.taxInvoice.update({
      where: { id },
      data: {
        customerTrn: validatedData.customerTrn,
        ourVatReg: validatedData.ourVatReg,
        dnNumber: validatedData.dnNumber,
        notes: validatedData.notes,
        terms: validatedData.terms,
        status: validatedData.status,
        lpoNumber: validatedData.lpoNumber,
        paymentTerms: validatedData.paymentTerms,
        sentAt: validatedData.status === 'SENT' ? new Date() : undefined,
      },
      include: {
        customer: { select: { id: true, fullName: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Update tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tax-invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: 'Tax invoice not found' }, { status: 404 });
    }

    await prisma.taxInvoice.delete({ where: { id } });
    return NextResponse.json({ message: 'Tax invoice deleted successfully' });
  } catch (error) {
    console.error('Delete tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
