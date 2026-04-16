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

    // ── Quotations ────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qWhere: any = { clientId: id };
    if (from || to) qWhere.createdAt = dateFilter;

    const quotations = await prisma.quotation.findMany({
      where: qWhere,
      select: {
        id: true,
        quotationNumber: true,
        status: true,
        total: true,
        createdAt: true,
        confirmedAt: true,
        paymentType: true,
        depositPercent: true,
        depositAmount: true,
        paymentNotes: true,
        lpoNumber: true,
        projectName: true,
        engineer: { select: { id: true, name: true } },
        taxInvoices: {
          select: { id: true, invoiceNumber: true, status: true, total: true, paidAmount: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Tax Invoices ──────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invWhere: any = { clientId: id };
    if (from || to) invWhere.createdAt = dateFilter;
    if (status) invWhere.status = status;

    const invoices = await prisma.taxInvoice.findMany({
      where: invWhere,
      include: {
        payments: { where: { status: 'CONFIRMED' }, orderBy: { paymentDate: 'asc' } },
        deliveryNotes: { select: { id: true, dnNumber: true, status: true, deliveredAt: true } },
        quotation: {
          select: {
            id: true, quotationNumber: true,
            paymentType: true, depositPercent: true, depositAmount: true, paymentNotes: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    // Quotation-level summary (pipeline)
    const totalQuoted = quotations.reduce((sum, q) => sum + q.total, 0);
    const confirmedQuotations = quotations.filter(q => q.status === 'CONFIRMED' || q.status === 'CONVERTED');
    const totalConfirmed = confirmedQuotations.reduce((sum, q) => sum + q.total, 0);

    return NextResponse.json({
      data: {
        client,
        quotations,
        invoices,
        summary: {
          totalQuoted,
          totalConfirmed,
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          quotationCount: quotations.length,
          invoiceCount: invoices.length,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
