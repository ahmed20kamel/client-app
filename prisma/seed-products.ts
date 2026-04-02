/**
 * Seed LitBeam & LitPAD products only.
 * Uses upsert on SKU — safe to run multiple times, won't delete any existing data.
 *
 * Run with:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/seed-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LitBeam & LitPAD products...');

  // Find or create admin user to satisfy createdById FK
  const admin = await prisma.user.findFirst({
    where: { OR: [{ email: 'admin@stride.com' }, { jobTitle: 'Administrator' }] },
    select: { id: true },
  });

  if (!admin) {
    throw new Error('Admin user not found. Make sure the main seed has been run first.');
  }

  // ─── LitBeam Lintel category ─────────────────────────────────────────────
  const litbeamCategory = await prisma.productCategory.upsert({
    where: { name: 'LitBeam Lintel' },
    update: {},
    create: {
      name: 'LitBeam Lintel',
      nameAr: 'عتبة ليت بيم',
      color: '#1e40af',
    },
  });

  const litpadCategory = await prisma.productCategory.upsert({
    where: { name: 'LitPAD' },
    update: {},
    create: {
      name: 'LitPAD',
      nameAr: 'ليت باد',
      color: '#7c3aed',
    },
  });

  // ─── LitBeam Lintel products (sold by LM) ────────────────────────────────
  const litbeamProducts = [
    { sku: 'LBS-10x20', size: '10×20', price: 40 },
    { sku: 'LBS-15x20', size: '15×20', price: 58 },
    { sku: 'LBS-20x20', size: '20×20', price: 65 },
    { sku: 'LBS-25x20', size: '25×20', price: 80 },
    { sku: 'LBS-20x30', size: '20×30', price: 90 },
  ];

  for (const p of litbeamProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        sellingPrice: p.price,
        size: p.size,
      },
      create: {
        sku: p.sku,
        name: `LitBeam Lintel ${p.size}`,
        nameAr: `عتبة ليت بيم ${p.size}`,
        description: `Lit-Beam of Length 100 cm — Size ${p.size} cm`,
        productCode: 'LBS',
        size: p.size,
        unitOfMeasure: 'LM',
        sellingPrice: p.price,
        categoryId: litbeamCategory.id,
        status: 'ACTIVE',
        createdById: admin.id,
      },
    });
    console.log(`  ✓ LitBeam ${p.size} — ${p.price} AED/LM`);
  }

  // ─── LitPAD products (sold by Nos) ───────────────────────────────────────
  const litpadProducts = [
    { sku: 'LPD-60x60', size: '60×60', price: 65 },
    { sku: 'LPD-80x60', size: '80×60', price: 80 },
  ];

  for (const p of litpadProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        sellingPrice: p.price,
        size: p.size,
      },
      create: {
        sku: p.sku,
        name: `LitPAD ${p.size}`,
        nameAr: `ليت باد ${p.size}`,
        description: `LitPAD — Size ${p.size} cm`,
        productCode: 'LPD',
        size: p.size,
        unitOfMeasure: 'Nos',
        sellingPrice: p.price,
        categoryId: litpadCategory.id,
        status: 'ACTIVE',
        createdById: admin.id,
      },
    });
    console.log(`  ✓ LitPAD ${p.size} — ${p.price} AED/Nos`);
  }

  console.log('\nDone! 7 products seeded successfully.');
  console.log('\nLitBeam Lintel (LM):');
  litbeamProducts.forEach(p => console.log(`  ${p.sku.padEnd(14)} ${p.size.padEnd(8)} ${p.price} AED/LM`));
  console.log('\nLitPAD (Nos):');
  litpadProducts.forEach(p => console.log(`  ${p.sku.padEnd(14)} ${p.size.padEnd(8)} ${p.price} AED/Nos`));
}

main()
  .catch((e) => {
    console.error('Product seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
