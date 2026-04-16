import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/quotations/[id]/convert — redirect to tax-invoice creation flow
// This endpoint is no longer used. Quotation conversion happens via /api/tax-invoices (POST)
// which creates a TaxInvoice from a CONFIRMED quotation and marks it CONVERTED.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    if (quotation.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Quotation has already been converted to a Tax Invoice' }, { status: 400 });
    }
    if (quotation.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Quotation must be CONFIRMED before generating a Tax Invoice' }, { status: 400 });
    }

    // Conversion happens via POST /api/tax-invoices with quotationId
    return NextResponse.json(
      { error: 'Use POST /api/tax-invoices with quotationId to generate a Tax Invoice from this quotation' },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
