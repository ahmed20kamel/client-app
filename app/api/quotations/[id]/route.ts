import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  updateQuotationSchema,
  approveQuotationSchema,
  rejectQuotationSchema,
} from '@/lib/validations/quotation';
import { z } from 'zod';

// GET /api/quotations/[id]
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
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        invoices: true,
        taxInvoices: {
          select: { id: true, invoiceNumber: true, status: true, createdAt: true },
        },
        deliveryNotes: {
          select: { id: true, dnNumber: true, status: true, createdAt: true },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: quotation });
  } catch (error) {
    console.error('Get quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/quotations/[id]
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
    const existingQuotation = await prisma.quotation.findUnique({ where: { id } });
    if (!existingQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    // ── Approval actions ─────────────────────────────────────────────────────
    if (action === 'approve') {
      const { lpoNumber, paymentTerms } = approveQuotationSchema.parse(body);
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          lpoNumber,
          paymentTerms,
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return NextResponse.json({ data: updated });
    }

    if (action === 'reject') {
      const { rejectionReason } = rejectQuotationSchema.parse(body);
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || null,
        },
        include: {
          customer: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return NextResponse.json({ data: updated });
    }

    if (action === 'send') {
      const updated = await prisma.quotation.update({
        where: { id },
        data: { status: 'SENT', sentAt: new Date() },
        include: {
          customer: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return NextResponse.json({ data: updated });
    }

    // ── Normal update ─────────────────────────────────────────────────────────
    const validatedData = updateQuotationSchema.parse(body);

    if (validatedData.items) {
      const itemsData = validatedData.items.map((item, index) => {
        const lineDiscount = item.discount || 0;
        const lm = item.linearMeters ?? (item.quantity * (item.length ?? 1));
        const lineTotal = (item.unit === 'LM' ? lm : item.quantity) * item.unitPrice * (1 - lineDiscount / 100);
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
      const discountPercent = validatedData.discountPercent ?? existingQuotation.discountPercent;
      const discountAmount = subtotal * discountPercent / 100;
      const taxPercent = validatedData.taxPercent ?? existingQuotation.taxPercent;
      const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
      const deliveryCharges = validatedData.deliveryCharges ?? existingQuotation.deliveryCharges;
      const total = subtotal - discountAmount + taxAmount + deliveryCharges;

      const result = await prisma.$transaction(async (tx) => {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        return tx.quotation.update({
          where: { id },
          data: {
            customerId: validatedData.customerId,
            engineerName: validatedData.engineerName,
            mobileNumber: validatedData.mobileNumber,
            projectName: validatedData.projectName,
            subject: validatedData.subject,
            notes: validatedData.notes,
            terms: validatedData.terms,
            validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
            subtotal,
            discountPercent,
            discountAmount,
            taxPercent,
            taxAmount,
            deliveryCharges,
            total,
            items: { create: itemsData },
          },
          include: {
            customer: { select: { id: true, fullName: true } },
            createdBy: { select: { id: true, fullName: true } },
            items: { orderBy: { sortOrder: 'asc' } },
          },
        });
      });

      return NextResponse.json({ data: result });
    } else {
      const updateData: Record<string, unknown> = {};
      if (validatedData.customerId !== undefined) updateData.customerId = validatedData.customerId;
      if (validatedData.engineerName !== undefined) updateData.engineerName = validatedData.engineerName;
      if (validatedData.mobileNumber !== undefined) updateData.mobileNumber = validatedData.mobileNumber;
      if (validatedData.projectName !== undefined) updateData.projectName = validatedData.projectName;
      if (validatedData.subject !== undefined) updateData.subject = validatedData.subject;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.terms !== undefined) updateData.terms = validatedData.terms;
      if (validatedData.validUntil !== undefined) {
        updateData.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
      }
      if (validatedData.deliveryCharges !== undefined) {
        updateData.deliveryCharges = validatedData.deliveryCharges;
        const subtotal = existingQuotation.subtotal;
        const discountAmount = existingQuotation.discountAmount;
        const taxAmount = existingQuotation.taxAmount;
        updateData.total = subtotal - discountAmount + taxAmount + validatedData.deliveryCharges;
      }

      const quotation = await prisma.quotation.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return NextResponse.json({ data: quotation });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Update quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quotations/[id]
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
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
