import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// One-time migration: recalculate taxAmount and total for all tax invoices
// using the correct formula: VAT on (subtotal - discount + deliveryCharges)
// Call once as Admin: POST /api/admin/fix-vat
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const invoices = await prisma.taxInvoice.findMany({
    select: {
      id: true,
      subtotal: true,
      discount: true,
      taxPercent: true,
      deliveryCharges: true,
      taxAmount: true,
      total: true,
    },
  });

  const updates: { id: string; oldTotal: number; newTotal: number; oldTax: number; newTax: number }[] = [];

  for (const inv of invoices) {
    const newTax   = (inv.subtotal - inv.discount + inv.deliveryCharges) * inv.taxPercent / 100;
    const newTotal = inv.subtotal - inv.discount + inv.deliveryCharges + newTax;

    // Round to 2 decimal places
    const newTaxR   = Math.round(newTax   * 100) / 100;
    const newTotalR = Math.round(newTotal * 100) / 100;

    // Skip if already correct (within 0.01 tolerance)
    if (Math.abs(newTaxR - inv.taxAmount) < 0.01 && Math.abs(newTotalR - inv.total) < 0.01) continue;

    updates.push({
      id:       inv.id,
      oldTax:   inv.taxAmount,
      newTax:   newTaxR,
      oldTotal: inv.total,
      newTotal: newTotalR,
    });

    await prisma.taxInvoice.update({
      where: { id: inv.id },
      data:  { taxAmount: newTaxR, total: newTotalR },
    });
  }

  return NextResponse.json({
    fixed:   updates.length,
    skipped: invoices.length - updates.length,
    details: updates,
  });
}
