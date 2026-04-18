import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
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
    const canView = await can(session.user.id, 'reports.view.all');
    const canViewOwn = await can(session.user.id, 'reports.view.own');
    if (!canView && !canViewOwn) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        client: { select: { id: true, companyName: true, trn: true } },
        engineer: { select: { id: true, name: true, mobile: true } },
        quotation: {
          select: {
            id: true, quotationNumber: true, status: true,
            lpoNumber: true, paymentTerms: true,
            paymentType: true, depositPercent: true, depositAmount: true,
            paymentNotes: true, confirmedAt: true,
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
        payments: {
          include: { createdBy: { select: { fullName: true } } },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Tax invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    logError('Get tax invoice error:', error);
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

    // Guard: PAID/PARTIAL/UNPAID are derived automatically — cannot be set manually
    if (validatedData.status && !['SENT', 'CANCELLED'].includes(validatedData.status)) {
      return NextResponse.json(
        { error: 'Status PAID/PARTIAL/UNPAID is derived automatically from payments and cannot be set manually.' },
        { status: 400 }
      );
    }
    // Guard: cannot un-cancel a cancelled invoice
    if (existing.status === 'CANCELLED' && validatedData.status && validatedData.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'A cancelled invoice cannot be reactivated.' },
        { status: 400 }
      );
    }

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
    logError('Update tax invoice error:', error);
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

    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: { deliveryNotes: { select: { id: true } } },
    });
    if (!invoice) {
      return NextResponse.json({ error: 'Tax invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot delete a fully paid invoice.' }, { status: 409 });
    }

    if (invoice.deliveryNotes.length > 0) {
      return NextResponse.json({ error: 'Cannot delete: this invoice has linked delivery notes. Delete them first.' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.taxInvoice.delete({ where: { id } });
      // Revert quotation back to CONFIRMED so a new invoice can be generated
      if (invoice.quotationId) {
        await tx.quotation.update({
          where: { id: invoice.quotationId },
          data: { status: 'CONFIRMED' },
        });
      }
    });

    return NextResponse.json({ message: 'Tax invoice deleted successfully' });
  } catch (error) {
    logError('Delete tax invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
