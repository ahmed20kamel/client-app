import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/seed-products — one-time product seeder (admin only)
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Categories ────────────────────────────────────────────────────────────
    const litbeamCat = await prisma.productCategory.upsert({
      where: { name: 'LitBeam Lintel' },
      update: {},
      create: { name: 'LitBeam Lintel', nameAr: 'عتبة ليت بيم', color: '#1e40af' },
    });

    const litpadCat = await prisma.productCategory.upsert({
      where: { name: 'LitPAD' },
      update: {},
      create: { name: 'LitPAD', nameAr: 'ليت باد', color: '#7c3aed' },
    });

    // ── LitBeam products (sold by LM) ─────────────────────────────────────────
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
        update: { sellingPrice: p.price, size: p.size },
        create: {
          sku: p.sku,
          name: `LitBeam Lintel ${p.size}`,
          nameAr: `عتبة ليت بيم ${p.size}`,
          description: `Lit-Beam of Length 100 cm — Size ${p.size} cm`,
          productCode: 'LBS',
          size: p.size,
          unitOfMeasure: 'LM',
          sellingPrice: p.price,
          categoryId: litbeamCat.id,
          status: 'ACTIVE',
          createdById: session.user.id,
        },
      });
    }

    // ── LitPAD products (sold by Nos) ─────────────────────────────────────────
    const litpadProducts = [
      { sku: 'LPD-60x60', size: '60×60', price: 65 },
      { sku: 'LPD-80x60', size: '80×60', price: 80 },
    ];

    for (const p of litpadProducts) {
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: { sellingPrice: p.price, size: p.size },
        create: {
          sku: p.sku,
          name: `LitPAD ${p.size}`,
          nameAr: `ليت باد ${p.size}`,
          description: `LitPAD — Size ${p.size} cm`,
          productCode: 'LPD',
          size: p.size,
          unitOfMeasure: 'Nos',
          sellingPrice: p.price,
          categoryId: litpadCat.id,
          status: 'ACTIVE',
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: '7 products seeded successfully',
      litbeam: litbeamProducts,
      litpad: litpadProducts,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
