import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

// GET /api/reports/sales-bonus
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from      = searchParams.get('from');
    const to        = searchParams.get('to');
    const product   = searchParams.get('product') || '';  // filter by item description keyword
    const bonusPct  = parseFloat(searchParams.get('bonusPct') || '4');

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    // Fetch invoices that have items matching the product keyword
    const invoices = await prisma.taxInvoice.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        status: { not: 'CANCELLED' },
        ...(product ? {
          items: {
            some: {
              description: { contains: product, mode: 'insensitive' },
            },
          },
        } : {}),
      },
      include: {
        client:   { select: { companyName: true } },
        customer: { select: { fullName: true } },
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows = invoices.map(inv => {
      // If product filter active, subtotal = only matching items; else full subtotal
      const filteredSubtotal = product
        ? inv.items
            .filter(it => it.description.toLowerCase().includes(product.toLowerCase()))
            .reduce((s, it) => s + it.total, 0)
        : inv.subtotal;

      return {
        id:              inv.id,
        invoiceNumber:   inv.invoiceNumber,
        date:            inv.createdAt,
        company:         inv.client?.companyName || inv.customer?.fullName || '—',
        amount:          filteredSubtotal,
        vat:             inv.taxAmount,
        deliveryCharges: inv.deliveryCharges,
        total:           inv.total,
      };
    });

    const totals = {
      amount:          rows.reduce((s, r) => s + r.amount, 0),
      vat:             rows.reduce((s, r) => s + r.vat, 0),
      deliveryCharges: rows.reduce((s, r) => s + r.deliveryCharges, 0),
      total:           rows.reduce((s, r) => s + r.total, 0),
    };

    const earnedBonus = totals.amount * bonusPct / 100;

    return NextResponse.json({ data: { rows, totals, earnedBonus, bonusPct } });
  } catch (error) {
    logError('Sales bonus report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
