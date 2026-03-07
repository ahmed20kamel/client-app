import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateInvoiceSchema } from '@/lib/validations/invoice';
import { z } from 'zod';

// GET /api/invoices/[id] - Get single invoice
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        quotation: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/invoices/[id] - Update invoice
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

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateInvoiceSchema.parse(body);

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
      const discountPercent = validatedData.discountPercent ?? existingInvoice.discountPercent;
      const discountAmount = subtotal * discountPercent / 100;
      const taxPercent = validatedData.taxPercent ?? existingInvoice.taxPercent;
      const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
      const total = subtotal - discountAmount + taxAmount;

      const result = await prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        // Update invoice with new items
        const invoice = await tx.invoice.update({
          where: { id },
          data: {
            customerId: validatedData.customerId,
            subject: validatedData.subject,
            notes: validatedData.notes,
            terms: validatedData.terms,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
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
        return invoice;
      });

      return NextResponse.json({ data: result });
    } else {
      // Update without items
      const updateData: Record<string, unknown> = {};
      if (validatedData.customerId !== undefined) updateData.customerId = validatedData.customerId;
      if (validatedData.subject !== undefined) updateData.subject = validatedData.subject;
      if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
      if (validatedData.terms !== undefined) updateData.terms = validatedData.terms;
      if (validatedData.dueDate !== undefined) {
        updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
      }
      if (validatedData.discountPercent !== undefined) {
        updateData.discountPercent = validatedData.discountPercent;
        const subtotal = existingInvoice.subtotal;
        const discountAmount = subtotal * validatedData.discountPercent / 100;
        const taxPercent = validatedData.taxPercent ?? existingInvoice.taxPercent;
        const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
        updateData.discountAmount = discountAmount;
        updateData.taxPercent = taxPercent;
        updateData.taxAmount = taxAmount;
        updateData.total = subtotal - discountAmount + taxAmount;
      }
      if (validatedData.taxPercent !== undefined && validatedData.discountPercent === undefined) {
        updateData.taxPercent = validatedData.taxPercent;
        const subtotal = existingInvoice.subtotal;
        const discountAmount = existingInvoice.discountAmount;
        const taxAmount = (subtotal - discountAmount) * validatedData.taxPercent / 100;
        updateData.taxAmount = taxAmount;
        updateData.total = subtotal - discountAmount + taxAmount;
      }

      const invoice = await prisma.invoice.update({
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

      return NextResponse.json({ data: invoice });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
