import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateQuotationSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// GET /api/quotations/[id] - Get single quotation
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
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        invoices: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: quotation });
  } catch (error) {
    console.error('Get quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/quotations/[id] - Update quotation
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

    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateQuotationSchema.parse(body);

    if (validatedData.items) {
      // Calculate totals from items
      const itemsData = validatedData.items.map((item, index) => {
        const lineDiscount = item.discount || 0;
        const lineTotal = item.quantity * item.unitPrice * (1 - lineDiscount / 100);
        return {
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
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
      const total = subtotal - discountAmount + taxAmount;

      const result = await prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        // Update quotation with new items
        const quotation = await tx.quotation.update({
          where: { id },
          data: {
            customerId: validatedData.customerId,
            subject: validatedData.subject,
            notes: validatedData.notes,
            terms: validatedData.terms,
            validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
            subtotal,
            discountPercent,
            discountAmount,
            taxPercent,
            taxAmount,
            total,
            items: {
              create: itemsData,
            },
          },
          include: {
            customer: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            items: true,
          },
        });
        return quotation;
      });

      return NextResponse.json({ data: result });
    } else {
      // Update without items
      const updateData: Record<string, unknown> = {};
      if (validatedData.customerId !== undefined) updateData.customerId = validatedData.customerId;
      if (validatedData.subject !== undefined) updateData.subject = validatedData.subject;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.terms !== undefined) updateData.terms = validatedData.terms;
      if (validatedData.validUntil !== undefined) {
        updateData.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
      }
      if (validatedData.discountPercent !== undefined) {
        updateData.discountPercent = validatedData.discountPercent;
        const subtotal = existingQuotation.subtotal;
        const discountAmount = subtotal * validatedData.discountPercent / 100;
        const taxPercent = validatedData.taxPercent ?? existingQuotation.taxPercent;
        const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
        updateData.discountAmount = discountAmount;
        updateData.taxPercent = taxPercent;
        updateData.taxAmount = taxAmount;
        updateData.total = subtotal - discountAmount + taxAmount;
      }
      if (validatedData.taxPercent !== undefined && validatedData.discountPercent === undefined) {
        updateData.taxPercent = validatedData.taxPercent;
        const subtotal = existingQuotation.subtotal;
        const discountAmount = existingQuotation.discountAmount;
        const taxAmount = (subtotal - discountAmount) * validatedData.taxPercent / 100;
        updateData.taxAmount = taxAmount;
        updateData.total = subtotal - discountAmount + taxAmount;
      }

      const quotation = await prisma.quotation.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          items: true,
        },
      });

      return NextResponse.json({ data: quotation });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotations/[id] - Delete quotation
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

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    await prisma.quotation.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
