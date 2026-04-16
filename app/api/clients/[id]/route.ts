import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateClientSchema = z.object({
  companyName: z.string().min(1).optional(),
  trn: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// GET /api/clients/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const [client, invoices, quotations] = await Promise.all([
      prisma.client.findUnique({
        where: { id },
        include: {
          engineers: { orderBy: { name: 'asc' } },
          _count: { select: { quotations: true, taxInvoices: true, deliveryNotes: true } },
        },
      }),
      prisma.taxInvoice.findMany({
        where: { clientId: id },
        include: {
          payments: { where: { status: 'CONFIRMED' }, orderBy: { paymentDate: 'asc' } },
          deliveryNotes: { select: { id: true, dnNumber: true, status: true, deliveredAt: true } },
          quotation: { select: { id: true, quotationNumber: true, paymentType: true, depositAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quotation.findMany({
        where: { clientId: id },
        select: {
          id: true, quotationNumber: true, status: true, total: true,
          createdAt: true, confirmedAt: true, lpoNumber: true, projectName: true,
          paymentType: true, depositAmount: true,
          engineer: { select: { id: true, name: true } },
          taxInvoices: { select: { id: true, invoiceNumber: true, status: true, paidAmount: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const totalInvoiced  = invoices.reduce((s, i) => s + i.total, 0);
    const totalPaid      = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    return NextResponse.json({
      data: {
        ...client,
        invoices,
        quotations,
        financial: { totalInvoiced, totalPaid, totalOutstanding },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const data = updateClientSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data,
      include: { engineers: true },
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Validation error' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    await prisma.client.update({ where: { id }, data: { status: 'INACTIVE' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
