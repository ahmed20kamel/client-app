import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

// GET /api/accounts — all clients with financial summary
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canView = await can(session.user.id, 'reports.view.all');
    const hasPageAccess = (session.user.pagePermissions ?? []).includes('page.accounts');
    if (!canView && !hasPageAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const search = request.nextUrl.searchParams.get('search') || '';
    const filter = request.nextUrl.searchParams.get('filter') || 'all'; // all | outstanding | paid | noInvoice

    const clients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
        ...(search ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        taxInvoices: {
          select: { id: true, total: true, paidAmount: true, status: true, createdAt: true },
        },
        _count: { select: { quotations: true } },
      },
      orderBy: { companyName: 'asc' },
    });

    const rows = clients.map(c => {
      const totalInvoiced  = c.taxInvoices.reduce((s, i) => s + i.total, 0);
      const totalPaid      = c.taxInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
      const totalOutstanding = totalInvoiced - totalPaid;
      const lastInvoiceDate = c.taxInvoices.length > 0
        ? c.taxInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null;
      return {
        id: c.id,
        companyName: c.companyName,
        trn: c.trn,
        phone: c.phone,
        invoiceCount: c.taxInvoices.length,
        quotationCount: c._count.quotations,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        lastInvoiceDate,
      };
    });

    // Filter
    const filtered = filter === 'outstanding' ? rows.filter(r => r.totalOutstanding > 0.01)
      : filter === 'paid' ? rows.filter(r => r.totalInvoiced > 0 && r.totalOutstanding <= 0.01)
      : filter === 'noInvoice' ? rows.filter(r => r.invoiceCount === 0)
      : rows;

    // Grand totals
    const grandTotal       = filtered.reduce((s, r) => s + r.totalInvoiced, 0);
    const grandPaid        = filtered.reduce((s, r) => s + r.totalPaid, 0);
    const grandOutstanding = filtered.reduce((s, r) => s + r.totalOutstanding, 0);

    return NextResponse.json({
      data: filtered,
      summary: { grandTotal, grandPaid, grandOutstanding, clientCount: filtered.length },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
