import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/clients/[id]/statement
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, companyName: true, trn: true, phone: true, email: true, address: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Build date filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) { const toDate = new Date(to); toDate.setHours(23, 59, 59, 999); dateFilter.lte = toDate; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { clientId: id };
    if (from || to) where.createdAt = dateFilter;
    if (status) where.status = status;

    const invoices = await prisma.taxInvoice.findMany({
      where,
      include: {
        payments: { where: { status: 'CONFIRMED' }, orderBy: { paymentDate: 'asc' } },
        deliveryNotes: { select: { id: true, dnNumber: true, status: true, deliveredAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate summary
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    return NextResponse.json({
      data: {
        client,
        invoices,
        summary: { totalInvoiced, totalPaid, totalOutstanding },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
