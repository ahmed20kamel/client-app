import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const invoices = await prisma.taxInvoice.findMany({
  select: { id: true, invoiceNumber: true, subtotal: true, discount: true, taxPercent: true, deliveryCharges: true, taxAmount: true, total: true },
});

let fixed = 0, skipped = 0;

for (const inv of invoices) {
  const newTax   = Math.round((inv.subtotal - inv.discount + inv.deliveryCharges) * inv.taxPercent / 100 * 100) / 100;
  const newTotal = Math.round((inv.subtotal - inv.discount + inv.deliveryCharges + newTax) * 100) / 100;

  if (Math.abs(newTax - inv.taxAmount) < 0.01 && Math.abs(newTotal - inv.total) < 0.01) {
    skipped++;
    continue;
  }

  console.log(`${inv.invoiceNumber}: VAT ${inv.taxAmount} → ${newTax}  |  Total ${inv.total} → ${newTotal}`);
  await prisma.taxInvoice.update({ where: { id: inv.id }, data: { taxAmount: newTax, total: newTotal } });
  fixed++;
}

console.log(`\n✓ Fixed: ${fixed}  |  Already correct: ${skipped}`);
await prisma.$disconnect();
