import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const search = request.nextUrl.searchParams.get('search') || '';

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { sku: { contains: search } }] }
      : {};

    const materials = await prisma.procurementMaterial.findMany({
      where,
      orderBy: { sku: 'asc' },
    });

    return NextResponse.json({ data: materials });
  } catch (error) {
    console.error('Get procurement materials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, sku, unitOfMeasure } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!sku?.trim()) return NextResponse.json({ error: 'SKU is required' }, { status: 400 });

    const existing = await prisma.procurementMaterial.findUnique({ where: { sku } });
    if (existing) return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });

    const material = await prisma.procurementMaterial.create({
      data: { name: name.trim(), sku: sku.trim(), unitOfMeasure: unitOfMeasure || 'Nos' },
    });

    return NextResponse.json({ data: material }, { status: 201 });
  } catch (error) {
    console.error('Create procurement material error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
