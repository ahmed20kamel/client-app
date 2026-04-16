import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

function fmt(n: number | null | undefined) {
  return n != null ? n.toFixed(2) : '0.00';
}

// GET /api/export?type=quotations|tax-invoices|accounts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canExport = await can(session.user.id, 'reports.view.all');
    if (!canExport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const type = request.nextUrl.searchParams.get('type') ?? 'quotations';
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    const dateFilter = from && to
      ? { createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') } }
      : {};

    let csv = '';
    let filename = 'export.csv';

    if (type === 'quotations') {
      const rows = await prisma.quotation.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        select: {
          quotationNumber: true,
          status: true,
          projectName: true,
          engineerName: true,
          subtotal: true,
          taxAmount: true,
          deliveryCharges: true,
          total: true,
          lpoNumber: true,
          createdAt: true,
          client: { select: { companyName: true } },
          createdBy: { select: { fullName: true } },
        },
      });

      const data = rows.map(r => ({
        'Quotation #': r.quotationNumber,
        'Status': r.status,
        'Client': r.client?.companyName ?? '',
        'Project': r.projectName ?? '',
        'Engineer': r.engineerName ?? '',
        'Subtotal (AED)': fmt(r.subtotal),
        'Tax (AED)': fmt(r.taxAmount),
        'Delivery (AED)': fmt(r.deliveryCharges),
        'Total (AED)': fmt(r.total),
        'LPO #': r.lpoNumber ?? '',
        'Created By': r.createdBy.fullName,
        'Created At': r.createdAt.toISOString().split('T')[0],
      }));

      csv = toCSV(data);
      filename = `quotations-${Date.now()}.csv`;

    } else if (type === 'tax-invoices') {
      const rows = await prisma.taxInvoice.findMany({
        where: dateFilter,
        orderBy: { createdAt: 'desc' },
        select: {
          invoiceNumber: true,
          status: true,
          projectName: true,
          lpoNumber: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          paidAmount: true,
          createdAt: true,
          client: { select: { companyName: true } },
          engineer: { select: { name: true } },
          createdBy: { select: { fullName: true } },
        },
      });

      const data = rows.map(r => ({
        'Invoice #': r.invoiceNumber,
        'Status': r.status,
        'Client': r.client?.companyName ?? '',
        'Project': r.projectName ?? '',
        'Engineer': r.engineer?.name ?? '',
        'LPO #': r.lpoNumber ?? '',
        'Subtotal (AED)': fmt(r.subtotal),
        'Tax (AED)': fmt(r.taxAmount),
        'Total (AED)': fmt(r.total),
        'Paid (AED)': fmt(r.paidAmount),
        'Outstanding (AED)': fmt(r.total - r.paidAmount),
        'Created By': r.createdBy.fullName,
        'Created At': r.createdAt.toISOString().split('T')[0],
      }));

      csv = toCSV(data);
      filename = `tax-invoices-${Date.now()}.csv`;

    } else if (type === 'accounts') {
      const clients = await prisma.client.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { companyName: 'asc' },
        select: {
          companyName: true,
          phone: true,
          email: true,
          trn: true,
          taxInvoices: {
            select: { total: true, paidAmount: true, status: true },
          },
        },
      });

      const data = clients.map(c => {
        const totalInvoiced = c.taxInvoices.reduce((s, i) => s + i.total, 0);
        const totalPaid = c.taxInvoices.reduce((s, i) => s + i.paidAmount, 0);
        const outstanding = totalInvoiced - totalPaid;
        return {
          'Company': c.companyName,
          'Phone': c.phone ?? '',
          'Email': c.email ?? '',
          'TRN': c.trn ?? '',
          'Total Invoiced (AED)': fmt(totalInvoiced),
          'Total Paid (AED)': fmt(totalPaid),
          'Outstanding (AED)': fmt(outstanding),
          'Invoice Count': c.taxInvoices.length,
        };
      });

      csv = toCSV(data);
      filename = `accounts-${Date.now()}.csv`;

    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
