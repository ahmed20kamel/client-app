import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/quotations/[id]/convert - Convert quotation to invoice
export async function POST(
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
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (quotation.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'Quotation has already been converted' },
        { status: 400 }
      );
    }

    // Auto-generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split('-');
      if (parts[1] === String(year)) seq = parseInt(parts[2]) + 1;
    }
    const invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`;

    // Create invoice from quotation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          subject: quotation.subject,
          notes: quotation.notes,
          terms: quotation.terms,
          subtotal: quotation.subtotal,
          discountPercent: quotation.discountPercent,
          discountAmount: quotation.discountAmount,
          taxPercent: quotation.taxPercent,
          taxAmount: quotation.taxAmount,
          total: quotation.total,
          createdById: session.user.id,
          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              total: item.total,
              sortOrder: item.sortOrder,
            })),
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

      // Update quotation status to CONVERTED
      await tx.quotation.update({
        where: { id },
        data: { status: 'CONVERTED' },
      });

      return invoice;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Convert quotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
