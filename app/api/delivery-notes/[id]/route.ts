import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateDeliveryNoteSchema } from '@/lib/validations/quotation';
import { z } from 'zod';

// GET /api/delivery-notes/[id]
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
    const note = await prisma.deliveryNote.findUnique({
      where: { id },
      include: {
        customer: true,
        taxInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            lpoNumber: true,
            paymentTerms: true,
          },
        },
        quotation: { select: { id: true, quotationNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Get delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/delivery-notes/[id]
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
    const existing = await prisma.deliveryNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateDeliveryNoteSchema.parse(body);

    const updated = await prisma.deliveryNote.update({
      where: { id },
      data: {
        salesmanSign: validatedData.salesmanSign,
        receiverName: validatedData.receiverName,
        receiverSign: validatedData.receiverSign,
        notes: validatedData.notes,
        status: validatedData.status,
        deliveredAt:
          validatedData.status === 'DELIVERED' && !existing.deliveredAt
            ? new Date()
            : validatedData.deliveredAt
            ? new Date(validatedData.deliveredAt)
            : undefined,
      },
      include: {
        customer: { select: { id: true, fullName: true } },
        taxInvoice: { select: { id: true, invoiceNumber: true } },
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
    console.error('Update delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/delivery-notes/[id]
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
    const note = await prisma.deliveryNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
    }

    await prisma.deliveryNote.delete({ where: { id } });
    return NextResponse.json({ message: 'Delivery note deleted successfully' });
  } catch (error) {
    console.error('Delete delivery note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
